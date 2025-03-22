// lib/s3-upload.ts
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET_NAME } from "./aws";
import { v4 as uuidv4 } from "uuid";

interface UploadResult {
  key: string;
  url: string;
}

/**
 * Upload an image to S3
 * @param imageBuffer The image buffer to upload
 * @param userId The ID of the user uploading the image
 * @param fileType The MIME type of the file (e.g., "image/jpeg")
 * @returns The S3 key and URL of the uploaded image
 */
export async function uploadImageToS3(
  imageBuffer: Buffer,
  userId: string,
  fileType: string
): Promise<UploadResult> {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("AWS credentials not configured");
  }

  const fileExtension = fileType.split("/")[1] || "jpg";
  const fileName = `${uuidv4()}.${fileExtension}`;
  const key = `photos/${userId}/${fileName}`;

  try {
    console.log(`Uploading image to S3: ${key}`);
    const params = {
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: imageBuffer,
      ContentType: fileType,
    };

    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    // Construct the S3 URL
    const url = `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || "ap-southeast-1"}.amazonaws.com/${key}`;
    console.log(`Uploaded successfully. URL: ${url}`);
    
    return {
      key,
      url,
    };
  } catch (error) {
    console.error("S3 upload error details:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to upload image to S3: ${error.message}`);
    }
    throw new Error("Failed to upload image to S3: Unknown error");
  }
}

/**
 * Mock S3 upload function for development use when AWS is not configured
 */
export function mockUploadImageToS3(
  _imageBuffer: Buffer,
  userId: string,
  fileType: string
): UploadResult {
  console.warn("Using mock S3 upload - DEVELOPMENT ONLY");
  const fileExtension = fileType.split("/")[1] || "jpg";
  const fileName = `${uuidv4()}.${fileExtension}`;
  const key = `photos/${userId}/${fileName}`;
  
  return {
    key,
    url: `https://placehold.co/600x400?text=Mock+Image`,
  };
}