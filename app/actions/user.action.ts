"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import User from "@/lib/models/user.model";
import { connect } from "@/lib/db";

export async function createUser(user: any) {
  try {
    await connect();
    
    // Check if user already exists first
    const existingUser = await User.findOne({ clerkId: user.clerkId });
    if (existingUser) {
      console.log('User already exists in MongoDB:', existingUser._id);
      return JSON.parse(JSON.stringify(existingUser));
    }
    
    const newUser = await User.create(user);
    console.log('User created successfully:', newUser._id);
    return JSON.parse(JSON.stringify(newUser));
  } catch (error) {
    console.error('Error creating user:', error);
    // Important: Rethrow the error so the webhook handler can handle it
    throw error;
  }
}

export async function updateUser(userData: any) {
  try {
    await connect()

    const updatedUser = await User.findOneAndUpdate(
      { clerkId: userData.clerkId },
      userData,
      { new: true, upsert: true }
    )
    return updatedUser
  } catch (error) {
    console.error('Error updating user:', error)
    throw error
  }
}

export async function deleteUser(clerkId: string) {
  try {
    await connect()

    const deletedUser = await User.findOneAndDelete({ clerkId })
    return deletedUser
  } catch (error) {
    console.error('Error deleting user:', error)
    throw error
  }
}