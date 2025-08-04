import express from 'express';

// Store active SSE connections
const sseConnections = new Map<string, express.Response>();

export const addSSEConnection = (batchId: string, res: express.Response) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ 
    status: 'connected', 
    message: 'Connected to batch formatting updates' 
  })}\n\n`);

  // Store this connection
  sseConnections.set(batchId, res);
  console.log(`SSE connection opened for batch ${batchId}`);

  return res;
};

export const sendSSEUpdate = (batchId: string, data: any) => {
  const connection = sseConnections.get(batchId);
  if (connection) {
    try {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      connection.write(message);
      console.log(`SSE update sent to batch ${batchId}:`, data);
    } catch (error) {
      console.error(`Failed to send SSE update to batch ${batchId}:`, error);
      sseConnections.delete(batchId);
    }
  }
};

export const closeSSEConnection = (batchId: string) => {
  const connection = sseConnections.get(batchId);
  if (connection) {
    connection.end();
    sseConnections.delete(batchId);
    console.log(`SSE connection closed for batch ${batchId}`);
  }
};

export const removeSSEConnection = (batchId: string) => {
  sseConnections.delete(batchId);
  console.log(`SSE connection removed for batch ${batchId}`);
};