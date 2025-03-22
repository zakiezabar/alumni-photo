import { 
  DetectModerationLabelsCommand, 
  DetectModerationLabelsCommandInput 
} from "@aws-sdk/client-rekognition";
import { rekognitionClient } from "./aws";

// Configure moderation sensitivity
const MODERATION_CONFIDENCE_THRESHOLD = 70; // 0-100, higher is more strict

// List of categories that should be rejected
const REJECTED_CATEGORIES = [
  "Explicit Nudity",
  "Violence",
  "Visually Disturbing",
  "Hate Symbols",
  "Drugs & Tobacco",
  "Alcohol",
];

export interface ModerationResult {
  approved: boolean;
  labels: Array<{
    name: string;
    confidence: number;
  }>;
  rejectionReason?: string;
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
    const command = new DetectModerationLabelsCommand(params);
    const response = await rekognitionClient.send(command);
    
    const detectedLabels = response.ModerationLabels || [];
    
    // Format the labels
    const labels = detectedLabels.map((label) => ({
      name: label.Name || "Unknown",
      confidence: label.Confidence || 0,
    }));

    // Check if any rejected categories are present
    const rejectedLabel = labels.find((label) => 
      REJECTED_CATEGORIES.some(category => 
        label.name.includes(category) && label.confidence >= MODERATION_CONFIDENCE_THRESHOLD
      )
    );

    if (rejectedLabel) {
      return {
        approved: false,
        labels,
        rejectionReason: `Image contains inappropriate content (${rejectedLabel.name})`,
      };
    }

    return {
      approved: true,
      labels,
    };
  } catch (error) {
    console.error("Moderation error:", error);
    throw new Error("Failed to moderate image");
  }
}