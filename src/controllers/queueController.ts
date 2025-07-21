import { Request, Response } from 'express';
import {
  getAllQueues,
  createNewQueue,
  getQueueById,
  updateQueueById,
  QueueNotFoundError,
  NewQueue,
} from '../services/queueService';

export const getQueues = async (_req: Request, res: Response) => {
  try {
    const queues = await getAllQueues();
    res.json(queues);
  } catch (err) {
    console.error('Error fetching queues:', err);
    res.status(500).json({ error: 'Failed to fetch queues' });
  }
};

export const createQueue = async (req: Request, res: Response) => {
  const { name, rootSpanIds }:NewQueue = req.body;

  if (!name || !Array.isArray(rootSpanIds)) {
    res.status(400).json({ error: 'Request must include name and a rootSpanIds array' });
    return;
  }

  try {
    const queue = await createNewQueue({ name, rootSpanIds });
    res.status(201).json(queue);
  } catch (err) {
    console.error('Error creating new queue:', err);
    res.status(500).json({ error: 'Failed to create new queue' });
  }
};

export const getQueue = async (req: Request, res: Response) => {
  try {
    const queue = await getQueueById(req.params.id);
    res.json(queue);
  } catch (err) {
    if (err instanceof QueueNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error(`Error fetching queue ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
};

export const updateQueue = async (req: Request, res: Response) => {
  const { name, rootSpanIds }:NewQueue = req.body;

  if (!name || !Array.isArray(rootSpanIds)) {
    res.status(400).json({ error: 'Request must include name and a rootSpanIds array' });
    return;
  }

  try {
    const queue = await updateQueueById(req.params.id, { name, rootSpanIds });
    res.json(queue);
  } catch (err) {
    if (err instanceof QueueNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error(`Error updating queue ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to update queue' });
  }
};
