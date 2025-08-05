import { Request, Response } from 'express';
import { addSSEConnection, removeSSEConnection } from '../services/sseService';

export const connectToBatchEvents = (req: Request, res: Response) => {
  const batchId = req.params.id;
  
  if (!batchId) {
    res.status(400).json({ error: 'Batch ID required' });
    return;
  }

  try {
    // Add the SSE connection
    addSSEConnection(batchId, res);

    // Handle client disconnect - this covers both normal and error disconnects
    req.on('close', () => {
      console.log(`Client disconnected from batch ${batchId} SSE`);
      removeSSEConnection(batchId);
    });

  } catch (error) {
    console.error(`Failed to establish SSE connection for batch ${batchId}:`, error);
    res.status(500).json({ error: 'Failed to establish connection' });
  }
};