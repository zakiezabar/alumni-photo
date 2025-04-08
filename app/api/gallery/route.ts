// app/api/gallery/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Define types for our data structures
interface UserData {
  firstName: string | null;
  lastName: string | null;
  photo: string | null;
}

interface ModerationData {
  approved: boolean;
  labels?: Array<{
    name: string;
    confidence: number;
  }>;
  rejectionReason?: string;
}

interface PhotoData {
  id: string;
  s3Key: string;
  s3Url: string;
  userId: string;
  createdAt: Date | null;
  description: string | null;
  moderation: ModerationData | null;
  user: UserData;
}

interface FormattedPhoto extends Omit<PhotoData, 'user'> {
  user: {
    name: string;
    avatar: string | null;
  };
}

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const countOnly = searchParams.get("count") === "true";

    // Get total count for pagination
    const totalPhotos = await prisma.photo.count();
    
    // If count-only is requested, return just the count
    if (countOnly) {
      return NextResponse.json({
        pagination: {
          total: totalPhotos,
          pages: Math.ceil(totalPhotos / limit),
          currentPage: page,
          limit,
        }
      });
    }

    const skip = (page - 1) * limit;

    // Fetch photos with pagination
    const photos = await prisma.photo.findMany({
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            photo: true, // Using 'photo' instead of 'avatar'
          },
        },
      },
    }) as PhotoData[];

    // Format the response to match what the frontend expects
    const formattedPhotos = photos.map((photo): FormattedPhoto => ({
      ...photo,
      user: {
        name: photo.user.firstName 
          ? (photo.user.lastName 
              ? `${photo.user.firstName} ${photo.user.lastName}`
              : photo.user.firstName)
          : "Anonymous",
        avatar: photo.user.photo
      }
    }));

    // Get total count for pagination
    // const totalPhotos = await prisma.photo.count();

    return NextResponse.json({
      photos: formattedPhotos,
      pagination: {
        total: totalPhotos,
        pages: Math.ceil(totalPhotos / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (error: unknown) {
    console.error("Gallery fetch error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: "Failed to fetch gallery", details: errorMessage },
      { status: 500 }
    );
  }
}