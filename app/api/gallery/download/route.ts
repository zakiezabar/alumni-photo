import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET_NAME } from "@/lib/aws";
import JSZip from "jszip";
import prisma from "@/lib/prisma";
import { Readable } from "stream";

// Required to make NextJS understand this route needs dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get photo IDs from request body
    const { photoIds } = await request.json();

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

    if (photos.length === 0) {
      return NextResponse.json(
        { error: "No photos found with the provided IDs" },
        { status: 404 }
      );
    }

    // Create a new zip file
    const zip = new JSZip();

    // Add each photo to the zip file
    const photoPromises = photos.map(async (photo) => {
      try {
        // Get photo from S3
        const getParams = {
          Bucket: S3_BUCKET_NAME,
          Key: photo.s3Key,
        };

        const s3Response = await s3Client.send(new GetObjectCommand(getParams));
        
        if (!s3Response.Body) {
          console.warn(`Photo ${photo.id} not found in S3`);
          return;
        }

        // Convert stream to buffer
        const chunks: Uint8Array[] = [];
        
        if (s3Response.Body instanceof Readable) {
          // Node.js stream
          const stream = s3Response.Body;
          await new Promise<void>((resolve, reject) => {
            stream.on('data', (chunk: Uint8Array) => chunks.push(chunk));
            stream.on('end', () => resolve());
            stream.on('error', (err) => reject(err));
          });
        } else if ('getReader' in s3Response.Body) {
          // Web ReadableStream
          const reader = s3Response.Body.getReader();
          let done = false;
          
          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            if (value) {
              chunks.push(value);
            }
          }
        } else {
          throw new Error('Unsupported response body type');
        }
        
        const buffer = Buffer.concat(chunks);
        
        // Get file extension from s3Key
        const fileExtension = photo.s3Key.split('.').pop() || 'jpg';
        
        // Create a filename based on photo details
        const timestamp = photo.createdAt ? new Date(photo.createdAt).toISOString().substring(0, 10) : 'unknown-date';
        const description = photo.description ? `-${photo.description.substring(0, 20).replace(/[^a-z0-9]/gi, '_')}` : '';
        const filename = `photo-${timestamp}${description}.${fileExtension}`;
        
        // Add file to zip
        zip.file(filename, buffer);
      } catch (error) {
        console.error(`Error processing photo ${photo.id}:`, error);
        // Continue with other photos even if one fails
      }
    });

    // Wait for all photos to be processed
    await Promise.all(photoPromises);

    // Generate the zip file
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    // Set response headers
    const headers = new Headers();
    headers.set('Content-Type', 'application/zip');
    headers.set('Content-Disposition', 'attachment; filename="event-photos.zip"');

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