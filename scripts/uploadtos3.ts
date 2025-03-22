// scripts/upload-to-s3.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

async function uploadFileToS3(
  filePath: string, 
  bucketName: string, 
  key?: string
): Promise<string> {
  try {
    // If no key is provided, use the filename
    const fileName = path.basename(filePath);
    const s3Key = key || fileName;
    
    // Read file content
    const fileContent = fs.readFileSync(filePath);
    
    // Set up the parameters for S3 upload
    const params = {
      Bucket: bucketName,
      Key: s3Key,
      Body: fileContent,
      ContentType: getContentType(fileName),
    };
    
    // Execute the upload command
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    
    console.log(`File uploaded successfully: ${s3Key}`);
    
    // Return the URL of the uploaded file
    return `https://${bucketName}.s3.amazonaws.com/${s3Key}`;
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw error;
  }
}

// Helper function to determine content type based on file extension
function getContentType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  
  const contentTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
  };
  
  return contentTypes[ext] || 'application/octet-stream';
}

// Run the script
async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: npx ts-node scripts/upload-to-s3.ts <file-path> <bucket-name> [optional-key]');
    process.exit(1);
  }
  
  const [filePath, bucketName, key] = args;
  
  try {
    const url = await uploadFileToS3(filePath, bucketName, key);
    console.log(`File is accessible at: ${url}`);
  } catch (error) {
    console.error('Upload failed:', error);
    process.exit(1);
  }
}

main();