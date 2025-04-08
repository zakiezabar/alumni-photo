import { NextRequest } from "next/server";

// Type augmentation for the global scope using a module declaration
// This extends the Node.js global object without using namespace syntax
type ConnectionsMap = Map<string, WritableStreamDefaultWriter<Uint8Array>>;

// Type the global variable for this file using a clean approach
// that satisfies both TypeScript and ESLint
interface GlobalWithConnections {
  connections?: ConnectionsMap;
}

// Create a safely typed reference to the global object
const globalStore: GlobalWithConnections = global as unknown as GlobalWithConnections;

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  
  // Write headers to establish SSE connection
  const encoder = new TextEncoder();
  
  // Keep track of this connection for broadcasting updates
  const connectionId = crypto.randomUUID();
  
  // Add this connection to a global connections map
  if (!globalStore.connections) {
    globalStore.connections = new Map();
  }
  globalStore.connections.set(connectionId, writer);
  
  // Remove this connection when client disconnects
  request.signal.addEventListener("abort", () => {
    if (globalStore.connections) {
      globalStore.connections.delete(connectionId);
    }
  });
  
  // Send initial message
  writer.write(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));
  
  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}