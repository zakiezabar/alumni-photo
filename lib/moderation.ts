import { 
  DetectModerationLabelsCommand, 
  DetectModerationLabelsCommandInput,
  ModerationLabel
} from "@aws-sdk/client-rekognition";
import { rekognitionClient } from "./aws";

// Configure moderation sensitivity
const MODERATION_CONFIDENCE_THRESHOLD = 90; // 0-100, higher is more strict

// List of categories that should be rejected
const REJECTED_CATEGORIES = [
  "Explicit Nudity",
  "Violence",
  "Visually Disturbing",
  "Hate Symbols",
  "Drugs & Tobacco",
  "Alcohol",
  "Rude Gestures",
  "Gambling",
  "Weapons",
  "Swimwear or Underwear",
  "Graphic Violence or Gore",
  "Political Symbols",
  "Offensive Text or Gestures",
  "Lewd or Suggestive Content"
];

export interface ModerationResult {
  approved: boolean;
  labels: Array<{
    name: string;
    confidence: number;
  }>;
  rejectionReason?: string;
  fallback?: boolean;
}

/**
 * Moderate image content using AWS Rekognition
 * @param imageBuffer The image buffer to moderate
 * @returns ModerationResult with approval status and any detected labels
 */
export async function moderateImage(imageBuffer: Buffer): Promise<ModerationResult> {
  const params: DetectModerationLabelsCommandInput = {
    Image: {
      Bytes: imageBuffer,
    },
    MinConfidence: MODERATION_CONFIDENCE_THRESHOLD,
  };

  try {
    console.log("Sending image to AWS Rekognition for moderation...");
    const command = new DetectModerationLabelsCommand(params);
    const response = await rekognitionClient.send(command);
    
    console.log("Received moderation response:", JSON.stringify(response));
    
    const detectedLabels = response.ModerationLabels || [];
    
    // Format the labels
    const labels = detectedLabels.map((label: ModerationLabel) => ({
      name: label.Name || "Unknown",
      confidence: label.Confidence || 0,
    }));

    // Check if any rejected categories are present
    const rejectedLabel = labels.find((label) => 
      REJECTED_CATEGORIES.some((category: string) => 
        label.name.includes(category) && label.confidence >= MODERATION_CONFIDENCE_THRESHOLD
      )
    );

    if (rejectedLabel) {
      return {
        approved: false,
        labels,
        rejectionReason: `Image contains inappropriate content. (${rejectedLabel.name})`,
      };
    }

    return {
      approved: true,
      labels,
    };
  } catch (error) {
    console.error("AWS Rekognition moderation error:", error);
    // Provide more detailed error information
    if (error instanceof Error) {
      throw new Error(`Failed to moderate image: ${error.message}`);
    }
    throw new Error("Failed to moderate image due to an unknown error");
  }
}

/**
 * Fallback moderation function for testing when AWS is not available
 */
export function mockModerateImage(): ModerationResult {
  console.warn("Using mock moderation - DEVELOPMENT ONLY");
  return {
    approved: true,
    labels: [],
    fallback: true
  };
}