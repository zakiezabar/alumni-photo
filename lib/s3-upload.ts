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
  const fileExtension = fileType.split("/")[1] || "jpg";
  const fileName = `${uuidv4()}.${fileExtension}`;
  const key = `photos/${userId}/${fileName}`;

  const params = {
    Bucket: S3_BUCKET_NAME,
    Key: key,
    Body: imageBuffer,
    ContentType: fileType,
  };

  try {
    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    // Construct the S3 URL
    const url = `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    
    return {
      key,
      url,
    };
  } catch (error) {
    console.error("S3 upload error:", error);
    throw new Error("Failed to upload image to S3");
  }
}