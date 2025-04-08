// app/api/gallery/delete-multiple/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET_NAME } from "@/lib/aws";

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
    
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user from database (using Clerk ID)
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user is admin - now that the schema is updated, this will work properly
    const isAdmin = user.role === 'ADMIN';

    // Fetch all photos to check ownership
    const photos = await prisma.photo.findMany({
      where: { 
        id: { in: photoIds }
      }
    });

    if (photos.length === 0) {
      return NextResponse.json(
        { error: "No photos found with the provided IDs" },
        { status: 404 }
      );
    }

    // Check permissions - admin can delete any photo, regular users can only delete their own
    const unauthorizedPhotoIds: string[] = [];

    if (!isAdmin) {
      for (const photo of photos) {
        if (photo.userId !== user.id) {
          unauthorizedPhotoIds.push(photo.id);
        }
      }

      if (unauthorizedPhotoIds.length > 0) {
        return NextResponse.json({
          error: "You don't have permission to delete some of these photos",
          unauthorizedPhotoIds
        }, { status: 403 });
      }
    }

    // Process deletions
    const results: {
      success: string[];
      failed: { id: string; error: string }[];
    } = {
      success: [],
      failed: []
    };

    for (const photo of photos) {
      try {
        // Delete from S3
        try {
          const deleteParams = {
            Bucket: S3_BUCKET_NAME,
            Key: photo.s3Key,
          };
          
          await s3Client.send(new DeleteObjectCommand(deleteParams));
        } catch (s3Error) {
          console.error(`Error deleting photo ${photo.id} from S3:`, s3Error);
          // Continue with database deletion even if S3 deletion fails
        }

        // Delete from database
        await prisma.photo.delete({
          where: { id: photo.id },
        });

        results.success.push(photo.id);
      } catch (error) {
        console.error(`Error deleting photo ${photo.id}:`, error);
        results.failed.push({
          id: photo.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      message: `Successfully deleted ${results.success.length} photos`,
      results
    });
  } catch (error: unknown) {
    console.error("Photo deletion error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: "Failed to delete photos", details: errorMessage },
      { status: 500 }
    );
  }
}