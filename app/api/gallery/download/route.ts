import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET_NAME } from "@/lib/aws";
import JSZip from "jszip";
import prisma from "@/lib/prisma";
// Removed unused Readable import

// Required to make NextJS understand this route needs dynamic rendering
export const dynamic = 'force-dynamic';

// Set a longer timeout for the API route (30 seconds)
export const maxDuration = 30;

// Type definitions for AWS S3 response body types
interface ReadableStreamLike {
  getReader(): {
    read(): Promise<{ value: Uint8Array | undefined; done: boolean }>;
  };
}

interface StreamLike {
  transformToByteArray?(): Promise<Uint8Array>;
  on?(event: string, callback: (data?: unknown) => void): void;
  pipe?(destination: unknown): void;
}

// Helper type for buffer extraction from various sources
type BufferSource = ReadableStreamLike | Blob | StreamLike;

export async function POST(request: NextRequest) {
  try {
    // Get photo IDs from request body
    const { photoIds } = await request.json();
    console.log(`Download request received for ${photoIds.length} photos`);

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid photo IDs provided" },
        { status: 400 }
      );
    }

    // Get photos from database
    const photos = await prisma.photo.findMany({
      where: {
        id: {
          in: photoIds,
        },
      },
      select: {
        id: true,
        s3Key: true,
        description: true,
        createdAt: true,
      },
    });

    console.log(`Found ${photos.length} photos in database out of ${photoIds.length} requested`);

    if (photos.length === 0) {
      return NextResponse.json(
        { error: "No photos found with the provided IDs" },
        { status: 404 }
      );
    }

    // Create a new zip file
    const zip = new JSZip();
    
    // Process photos in smaller batches to avoid memory issues
    const batchSize = 5;
    const batches = [];
    
    for (let i = 0; i < photos.length; i += batchSize) {
      batches.push(photos.slice(i, i + batchSize));
    }
    
    console.log(`Processing photos in ${batches.length} batches of up to ${batchSize} photos each`);
    
    // Process each batch sequentially
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} photos`);
      
      // Process each photo in the batch with better error handling
      const batchPromises = batch.map(async (photo) => {
        try {
          console.log(`Processing photo ${photo.id}`);
          
          // Get photo from S3
          const getParams = {
            Bucket: S3_BUCKET_NAME,
            Key: photo.s3Key,
          };
          
          console.log(`Fetching from S3: ${photo.s3Key}`);
          const s3Response = await s3Client.send(new GetObjectCommand(getParams));
          
          if (!s3Response.Body) {
            console.warn(`Photo ${photo.id} body not found in S3 response`);
            return { id: photo.id, success: false, error: 'No body in S3 response' };
          }
          
          // Convert stream to buffer with improved error handling
          let buffer: Buffer;
          
          try {
            // Get the stream data into a buffer regardless of type
            const chunks: Array<Uint8Array> = [];
            
            // Cast to our helper type
            const bodySource = s3Response.Body as unknown as BufferSource;
            
            // If the body is a Web ReadableStream (check for getReader method)
            if (typeof (bodySource as ReadableStreamLike).getReader === 'function') {
              const reader = (bodySource as ReadableStreamLike).getReader();
              let done = false;
              
              while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                if (value) {
                  chunks.push(value);
                }
              }
            } 
            // If it's a response body with transformToByteArray method
            else if (typeof (bodySource as StreamLike).transformToByteArray === 'function') {
              const byteArray = await (bodySource as StreamLike).transformToByteArray?.();
              if (byteArray) {
                chunks.push(byteArray);
              }
            }
            // If it's a traditional blob-like object
            else if (bodySource instanceof Blob) {
              const arrayBuffer = await (bodySource as Blob).arrayBuffer();
              chunks.push(new Uint8Array(arrayBuffer));
            }
            // Last resort, try to handle AWS SDK's SdkStream
            else {
              console.log(`Using fallback buffer conversion for photo ${photo.id}`);
              // Collect data using any available method
              const bufferFromStream = await new Promise<Buffer>((resolve, reject) => {
                const streamChunks: Buffer[] = [];
                
                try {
                  const stream = bodySource as StreamLike;
                  
                  if (typeof stream.on === 'function') {
                    stream.on('data', (chunk: unknown) => {
                      if (chunk) {
                        streamChunks.push(Buffer.from(chunk as Buffer));
                      }
                    });
                    stream.on('end', () => resolve(Buffer.concat(streamChunks)));
                    stream.on('error', (error: unknown) => {
                      reject(error instanceof Error ? error : new Error(String(error)));
                    });
                  } else {
                    // If stream methods aren't available, reject
                    reject(new Error('Unsupported stream type'));
                  }
                } catch (error) {
                  reject(error);
                }
              }).catch((error) => {
                console.error(`Stream handling error for photo ${photo.id}:`, error);
                throw error;
              });
              
              chunks.push(bufferFromStream);
            }
            
            // Combine all chunks into a single buffer
            buffer = Buffer.concat(chunks);
            
            // Get file extension from s3Key
            const fileExtension = photo.s3Key.split('.').pop() || 'jpg';
            
            // Create a filename based on photo details
            const timestamp = photo.createdAt 
              ? new Date(photo.createdAt).toISOString().replace(/[:T]/g, '-').substring(0, 19)
              : 'unknown-date';
            
            const description = photo.description 
              ? `-${photo.description.substring(0, 20).replace(/[^a-z0-9]/gi, '_')}`
              : '';
            
            const filename = `photo-${timestamp}${description}.${fileExtension}`;
            
            // Add file to zip
            zip.file(filename, buffer);
            console.log(`Added photo ${photo.id} to ZIP as ${filename} (${buffer.length} bytes)`);
            
            return { id: photo.id, success: true };
          } catch (streamError) {
            console.error(`Stream processing error for photo ${photo.id}:`, streamError);
            return { id: photo.id, success: false, error: streamError instanceof Error ? streamError.message : 'Stream processing error' };
          }
        } catch (error) {
          console.error(`Error processing photo ${photo.id}:`, error);
          return { id: photo.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });
      
      // Wait for all photos in this batch to be processed
      await Promise.all(batchPromises);
      console.log(`Completed batch ${batchIndex + 1}/${batches.length}`);
    }

    console.log('Generating ZIP file...');
    // Generate the zip file with optimized settings
    const zipBuffer = await zip.generateAsync({ 
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: {
        level: 6 // Balance between speed and compression (1-9)
      }
    });
    console.log(`ZIP file generated (${zipBuffer.length} bytes)`);

    // Set response headers
    const headers = new Headers();
    headers.set('Content-Type', 'application/zip');
    headers.set('Content-Disposition', 'attachment; filename="event-photos.zip"');
    headers.set('Content-Length', zipBuffer.length.toString());
    
    console.log('Sending ZIP file response');
    return new NextResponse(zipBuffer, {
      status: 200,
      headers,
    });
  } catch (error: unknown) {
    console.error("Photo download error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: "Failed to download photos", details: errorMessage },
      { status: 500 }
    );
  }
}