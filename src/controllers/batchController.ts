import { Request, Response } from 'express';
import {
  getBatchSummariesByProject,
  createNewBatch,
  getBatchSummaryById,
  updateBatchById,
  deleteBatchById,
  formatBatch,
} from '../services/batchService';
import { NewBatch, UpdateBatch } from '../types/types';
import { BatchNotFoundError } from '../errors/errors';
import { getAllRootSpans, nullifyBatchId } from '../services/rootSpanService';
import { FIRST_PAGE, DEFAULT_PAGE_QUANTITY, MAX_SPANS_PER_BATCH } from '../constants/index';

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

  if (!name || !projectId || !Array.isArray(rootSpanIds)) {
    res.status(400).json({ error: 'Request must include name and a rootSpanIds array' });
    return;
  }

  if (rootSpanIds.length > MAX_SPANS_PER_BATCH) {
    res.status(400).json({ error: `Maximum batch size is ${MAX_SPANS_PER_BATCH}` });
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

    if (!batchId) {
      console.error("BatchId is required");
      res.status(400).json({ error: "Failed to get batch" })
      return
    }

    if (!projectId) {
      console.error("ProjectId is required");
      res.status(400).json({ error: "Failed to get batch" })
      return
    }

    const pageNumber = parseInt(req.query.pageNumber as string) || FIRST_PAGE;
    const numPerPage = parseInt(req.query.numPerPage as string) || DEFAULT_PAGE_QUANTITY;
    
    const { rootSpans, totalCount } = await getAllRootSpans({
      batchId,
      projectId,
      spanName,
      pageNumber,
      numPerPage,
    });

    const batchSummary = await getBatchSummaryById(batchId);
    res.status(200).json({ rootSpans, batchSummary, totalCount });
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
  const batchId = req.params.id;
  const { name, rootSpanIds }:UpdateBatch = req.body;

  if (!batchId) {
    res.status(400).json({error: "BatchId required to update batch"});
    return;
  }

  if (!name || !Array.isArray(rootSpanIds)) {
    res.status(400).json({ error: 'Request must include name and a rootSpanIds array' });
    return;
  }

  if (rootSpanIds.length > MAX_SPANS_PER_BATCH) {
    res.status(400).json({ error: `Maximum batch size is ${MAX_SPANS_PER_BATCH}` });
    return;
  }

  try {
    const updatedBatch = await updateBatchById(batchId, { name, rootSpanIds });
    res.status(200).json(updatedBatch);
  } catch (err) {
    if (err instanceof BatchNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error(`Error updating batch ${batchId}:`, err);
    res.status(500).json({ error: 'Failed to update batch' });
  }
};

export const deleteBatch = async (req: Request, res: Response) => {
  const batchId = req.params.id;
  try {
    if (!batchId) {
      console.error("batchId query parameter is required to delete batch")
      res.status(400).json({error: "Missing batchID query parameter"})
    }
    const deletedBatch = await deleteBatchById(batchId);
    res.status(200).json({ message: 'Batch deleted successfully', deletedBatch });
  } catch (err) {
    if (err instanceof BatchNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error(`Error deleting batch ${batchId}:`, err);
    res.status(500).json({ error: 'Failed to delete batch' });
  }
};

export const removeSpanFromBatch = async (req: Request, res: Response) => {
  const batchId = req.params.batchId;
  const spanId = req.params.spanId;

  if (!batchId || !spanId) {
    res.status(400).json({ error: "spanId and batchId required" })
    return;
  }
  
  try {
    const spanRemoved = await nullifyBatchId(spanId, batchId);

    if (!spanRemoved) {
      res.status(404).json({ error: "Span not found in batch" })
    }

    res.status(200).json({ message: `Span removed from batch ${batchId}` })
  } catch (e) {
    console.error("Unable to remove span from batch", e);
    res.status(500).json({ error: "Failed to remove span from batch" });
    return;
  }
}

export const formatBatchByLLM = async (req: Request, res: Response) => {
  try {
    const batchId = req.params.batchId;
    if (batchId === undefined) throw new Error("missing batchId");
    await formatBatch(batchId);
    res.status(200).json({message: "success"});
  } catch (e) {
    console.error(e);
    throw e;
  }
}
