// Define a proper interface for update messages
export interface GalleryUpdate {
  type: string;
  photoId?: string;
  timestamp: string;
  [key: string]: unknown; // Allow additional properties
}

// Type definition for our connections map
type ConnectionsMap = Map<string, WritableStreamDefaultWriter<Uint8Array>>;

// Type augmentation for the global store
interface GlobalWithConnections {
  connections?: ConnectionsMap;
}

// Create a safely typed reference to the global object
const globalStore: GlobalWithConnections = global as unknown as GlobalWithConnections;

export async function broadcastGalleryUpdate(update: GalleryUpdate): Promise<void> {
  if (!globalStore.connections) return;
  
  const encoder = new TextEncoder();
  const message = encoder.encode(`data: ${JSON.stringify(update)}\n\n`);
  
  // Send to all connected clients
  for (const writer of globalStore.connections.values()) {
    try {
      await writer.write(message);
    } catch (err) {
      // Handle errors or closed connections
      console.error("Error broadcasting update:", err);
    }
  }
}