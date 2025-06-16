import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Count user's photos
    const photoCount = await prisma.photo.count({
      where: {
        userId: user.id,
      },
    });

    const maxUploads = 20;
    const remainingUploads = Math.max(0, maxUploads - photoCount);

    return NextResponse.json({
      count: photoCount,
      remainingUploads: remainingUploads,
      maxUploads: maxUploads
    });
  } catch (error: unknown) {
    console.error("Error getting photo count:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: "Failed to get photo count", details: errorMessage },
      { status: 500 }
    );
  }
}