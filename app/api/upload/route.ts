import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { moderateImage, mockModerateImage } from "@/lib/moderation";
import { uploadImageToS3 } from "@/lib/s3-upload";
import { broadcastGalleryUpdate } from "@/lib/broadcastUpdate";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("Looking for user with clerkId:", userId);

    // Get user from database (using Clerk ID)
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { clerkId: userId },
      });
      
      // Log the complete user object to debug
      console.log("Found user object:", JSON.stringify(user, null, 2));
      
    } catch (userError) {
      console.error("Error finding user:", userError);
      return NextResponse.json(
        { error: "Database error when finding user", details: userError instanceof Error ? userError.message : String(userError) },
        { status: 500 }
      );
    }

    if (!user) {
      console.log("User not found for clerkId:", userId);
      return NextResponse.json(
        { error: "User not found in the database. Please contact support." },
        { status: 404 }
      );
    }

    // Check if user has reached their upload limit
    const photoCount = await prisma.photo.count({
      where: {
        userId: user.id,
      },
    });

    const MAX_UPLOADS = 10;
    if (photoCount >= MAX_UPLOADS) {
      return NextResponse.json(
        { 
          error: "Upload limit reached", 
          details: `You can only upload a maximum of ${MAX_UPLOADS} photos.` 
        },
        { status: 403 }
      );
    }

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const fileType = file.type;
    if (!fileType.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Moderate the image with fallback for development/testing
    let moderationResult;
    try {
      // Try to use AWS Rekognition for moderation
      moderationResult = await moderateImage(buffer);
      console.log("Moderation result:", moderationResult);
    } catch (moderationError) {
      console.error("Moderation error:", moderationError);
      
      // Check if we're in development mode
      if (process.env.NODE_ENV === 'development' || process.env.SKIP_MODERATION === 'true') {
        console.warn("Using mock moderation in development mode");
        moderationResult = mockModerateImage();
      } else {
        // In production, fail with the error
        return NextResponse.json(
          { 
            error: "Failed to process upload", 
            details: moderationError instanceof Error ? moderationError.message : "Failed to moderate image" 
          },
          { status: 500 }
        );
      }
    }

    if (!moderationResult.approved) {
      return NextResponse.json(
        { 
          error: "Image rejected",
          reason: moderationResult.rejectionReason 
        },
        { status: 400 }
      );
    }

    // Upload to S3
    try {
      const s3Result = await uploadImageToS3(buffer, user.id, fileType);
      
      // Save to database
      const photo = await prisma.photo.create({
        data: {
          s3Key: s3Result.key,
          s3Url: s3Result.url,
          userId: user.id,
          createdAt: new Date(), // Explicitly set the date
          moderation: JSON.parse(JSON.stringify(moderationResult)),
          description: formData.get("description") as string || null,
        },
      });

      // Broadcast update about the new photo
      await broadcastGalleryUpdate({
        type: "new-photo",
        photoId: photo.id,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        photo: {
          id: photo.id,
          url: photo.s3Url,
          createdAt: photo.createdAt,
        },
      });
    } catch (uploadError) {
      console.error("S3 upload error:", uploadError);
      return NextResponse.json(
        { 
          error: "Failed to upload to S3", 
          details: uploadError instanceof Error ? uploadError.message : "Unknown upload error" 
        },
        { status: 500 }
      );
    }

  } catch (error: unknown) {
    console.error("Upload error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: "Failed to process upload", details: errorMessage },
      { status: 500 }
    );
  }
}