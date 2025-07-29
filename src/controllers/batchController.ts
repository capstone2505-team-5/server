import { Request, Response } from 'express';
import {
  getAllBatches,
  createNewBatch,
  getBatchById,
  updateBatchById,
  deleteBatchById
} from '../services/batchService';
import { NewBatch } from '../types/types';
import { BatchNotFoundError } from '../errors/errors';

export const getBatches = async (_req: Request, res: Response) => {
  try {
    const batches = await getAllBatches();
    res.json(batches);
  } catch (err) {
    console.error('Error fetching batches:', err);
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
};

export const createBatch = async (req: Request, res: Response) => {
  const { name, rootSpanIds }:NewBatch = req.body;

  if (!name || !Array.isArray(rootSpanIds)) {
    res.status(400).json({ error: 'Request must include name and a rootSpanIds array' });
    return;
  }

  try {
    const batch = await createNewBatch({ name, rootSpanIds });
    res.status(201).json(batch);
  } catch (err) {
    console.error('Error creating new batch:', err);
    res.status(500).json({ error: 'Failed to create new batch' });
  }
};

export const getBatch = async (req: Request, res: Response) => {
  try {
    const batch = await getBatchById(req.params.id);
    res.json(batch);
  } catch (err) {
    if (err instanceof BatchNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error(`Error fetching batch ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to fetch batch' });
  }
};

export const updateBatch = async (req: Request, res: Response) => {
  const { name, rootSpanIds }:NewBatch = req.body;

  if (!name || !Array.isArray(rootSpanIds)) {
    res.status(400).json({ error: 'Request must include name and a rootSpanIds array' });
    return;
  }

  try {
    const batch = await updateBatchById(req.params.id, { name, rootSpanIds });
    res.json(batch);
  } catch (err) {
    if (err instanceof BatchNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error(`Error updating batch ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to update batch' });
  }
};

export const deleteBatch = async (req: Request, res: Response) => {
  try {
    const deletedBatch = await deleteBatchById(req.params.id);
    res.json({ message: 'Batch deleted successfully', deletedBatch });
  } catch (err) {
    if (err instanceof BatchNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error(`Error deleting batch ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to delete batch' });
  }
};
