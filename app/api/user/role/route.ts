// app/api/user/role/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// Required to make NextJS understand this route needs dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Verify authentication
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user from database (using Clerk ID)
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Now that the schema is updated, we can directly use the role field
    return NextResponse.json({
      userId: user.id,
      role: user.role
    });
  } catch (error: unknown) {
    console.error("Error fetching user role:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: "Failed to fetch user role", details: errorMessage },
      { status: 500 }
    );
  }
}