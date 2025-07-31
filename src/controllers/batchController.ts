import { Request, Response } from 'express';
import {
  getBatchSummariesByProject,
  createNewBatch,
  getBatchSummaryById,
  updateBatchById,
  deleteBatchById
} from '../services/batchService';
import { NewBatch, UpdateBatch } from '../types/types';
import { BatchNotFoundError } from '../errors/errors';
import { getAllRootSpans } from '../services/rootSpanService';

const FIRST_PAGE = 1;
const DEFAULT_PAGE_QUANTITY = 20;

export const getBatchesByProject = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;

    if (!projectId) {
      res.status(400).json({ error: 'projectId parameter is required' });
      return;
    }

    const batches = await getBatchSummariesByProject(projectId);
    res.status(200).json(batches);
  } catch (err) {
    console.error('Error fetching batches:', err);
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
};

export const createBatch = async (req: Request, res: Response) => {
  const { name, projectId, rootSpanIds }: NewBatch = req.body;

  if (!name || !Array.isArray(rootSpanIds)) {
    res.status(400).json({ error: 'Request must include name and a rootSpanIds array' });
    return;
  }

  try {
    const batch = await createNewBatch({ name, projectId, rootSpanIds });
    res.status(201).json(batch);
  } catch (err) {
    console.error('Error creating new batch:', err);
    res.status(500).json({ error: 'Failed to create new batch' });
  }
};

export const getBatch = async (req: Request, res: Response) => {
  try {
    const batchId = req.params.id as string | undefined;
    const projectId = req.query.projectId as string | undefined;
    const spanName = req.query.spanName as string | undefined;

    const pageNumber = parseInt(req.query.pageNumber as string) || FIRST_PAGE;
    const numPerPage = parseInt(req.query.numPerPage as string) || DEFAULT_PAGE_QUANTITY;
    
    const { rootSpans, totalCount } = await getAllRootSpans({
      batchId,
      projectId,
      spanName,
      pageNumber,
      numPerPage,
    });

    const batchSummary = await getBatchSummaryById(req.params.id);
    res.json({ rootSpans, batchSummary, totalCount });
  } catch (err) {
    if (err instanceof BatchNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error(`Error fetching batch ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to fetch batch' });
  }
};

export const getBatchlessSpans = async (req: Request, res: Response) => {
  try {
    const batchId = undefined;
    const projectId = req.query.projectId as string | undefined;
    const spanName = req.query.spanName as string | undefined;

    const pageNumber = parseInt(req.query.pageNumber as string) || FIRST_PAGE;
    const numPerPage = parseInt(req.query.numPerPage as string) || DEFAULT_PAGE_QUANTITY;
    
    const { rootSpans, totalCount } = await getAllRootSpans({
      batchId,
      projectId,
      spanName,
      pageNumber,
      numPerPage,
    });

    res.json({ batchlessRootSpans: rootSpans, totalCount });
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
  console.log('test');
  const { name, rootSpanIds }:UpdateBatch = req.body;

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
