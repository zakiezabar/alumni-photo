import { NextResponse } from "next/server";
import { connect } from "@/lib/db";
import User from "@/lib/models/user.model";

export async function GET() {
  try {
    console.log("Attempting to connect to MongoDB...");
    await connect();
    console.log("MongoDB connection successful");
    
    // Create a unique test user
    const timestamp = Date.now();
    const testUser = {
      clerkId: `test-${timestamp}`,
      email: `test-${timestamp}@example.com`,
      username: `testuser-${timestamp}`,
      firstName: 'Test',
      lastName: 'User',
      photo: 'https://via.placeholder.com/150',
    };
    
    console.log("Attempting to create test user:", testUser);
    const newUser = await User.create(testUser);
    console.log("Test user created successfully");
    
    return NextResponse.json({
      success: true,
      message: 'Test user created successfully',
      user: JSON.parse(JSON.stringify(newUser))
    });
  } catch (error) {
    console.error("Error in test endpoint:", error);
    return NextResponse.json({
      success: false,
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}