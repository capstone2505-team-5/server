import {
  createBatchSchema,
  deleteBatchSchema,
  formatBatchByLLMSchema,
  getBatchesByProjectSchema,
  getBatchSchema,
  getBatchStatusSchema,
  removeSpanFromBatchSchema,
  updateBatchSchema,
} from '../schemas/batchSchemas';
import { Request, Response } from 'express';
import {
  getBatchSummariesByProject,
  createNewBatch,
  getBatchSummaryById,
  updateBatchById,
  deleteBatchById,
  formatBatch,
  isFormatted,
} from '../services/batchService';
import { BatchNotFoundError } from '../errors/errors';
import { fetchFormattedRootSpans, nullifyBatchId } from '../services/rootSpanService';

export const getBatchesByProject = async (req: Request, res: Response) => {
  try {
    const validationResult = getBatchesByProjectSchema.safeParse(req);

    if (!validationResult.success) {
      res.status(400).json({ errors: validationResult.error.flatten() });
      return;
    }

    const { id: projectId } = validationResult.data.params;

    const batches = await getBatchSummariesByProject(projectId);
    res.status(200).json(batches);
  } catch (err) {
    console.error('Error fetching batches:', err);
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
};

export const createBatch = async (req: Request, res: Response) => {
  const validationResult = createBatchSchema.safeParse(req);
  if (!validationResult.success) {
    res.status(400).json({ errors: validationResult.error.flatten() });
    return;
  }

  const { body } = validationResult.data;

  try {
    const batch = await createNewBatch(body);
    res.status(201).json(batch);
  } catch (err) {
    console.error('Error creating new batch:', err);
    res.status(500).json({ error: 'Failed to create new batch' });
  }
};

export const getBatch = async (req: Request, res: Response) => {
  try {
    const validationResult = getBatchSchema.safeParse(req);
    if (!validationResult.success) {
      res.status(400).json({ errors: validationResult.error.flatten() });
      return;
    }

    const {
      params: { id: batchId },
      query: { spanName, pageNumber, numPerPage: numberPerPage },
    } = validationResult.data;

    const { rootSpans, totalCount } = await fetchFormattedRootSpans({
      batchId,
      projectId: undefined,
      spanName,
      pageNumber,
      numberPerPage,
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
  try {
    const validationResult = updateBatchSchema.safeParse(req);
    if (!validationResult.success) {
      res.status(400).json({ errors: validationResult.error.flatten() });
      return;
    }

    const {
      params: { id: batchId },
      body,
    } = validationResult.data;

    const updatedBatch = await updateBatchById(batchId, body);
    res.status(200).json(updatedBatch);
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
    const validationResult = deleteBatchSchema.safeParse(req);
    if (!validationResult.success) {
      res.status(400).json({ errors: validationResult.error.flatten() });
      return;
    }
    const { id: batchId } = validationResult.data.params;
    const deletedBatch = await deleteBatchById(batchId);
    res.status(200).json({ message: 'Batch deleted successfully', deletedBatch });
  } catch (err) {
    if (err instanceof BatchNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error(`Error deleting batch ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to delete batch' });
  }
};

export const removeSpanFromBatch = async (req: Request, res: Response) => {
  try {
    const validationResult = removeSpanFromBatchSchema.safeParse(req);
    if (!validationResult.success) {
      res.status(400).json({ errors: validationResult.error.flatten() });
      return;
    }

    const {
      params: { batchId, spanId },
    } = validationResult.data;

    const spanRemoved = await nullifyBatchId(spanId, batchId);

    if (!spanRemoved) {
      res.status(404).json({ error: 'Span not found in batch' });
    }

    res.status(200).json({ message: `Span removed from batch ${batchId}` });
  } catch (e) {
    console.error('Unable to remove span from batch', e);
    res.status(500).json({ error: 'Failed to remove span from batch' });
    return;
  }
};

export const formatBatchByLLM = async (req: Request, res: Response) => {
  try {
    const validationResult = formatBatchByLLMSchema.safeParse(req);
    if (!validationResult.success) {
      res.status(400).json({ errors: validationResult.error.flatten() });
      return;
    }

    const {
      params: { batchId },
    } = validationResult.data;

    await formatBatch(batchId);
    res.status(200).json({ message: 'success' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to format batch' });
    return;
  }
};

export const getBatchStatus = async (req: Request, res: Response) => {
  try {
    const validationResult = getBatchStatusSchema.safeParse(req);
    if (!validationResult.success) {
      res.status(400).json({ errors: validationResult.error.flatten() });
      return;
    }

    const {
      params: { batchId },
    } = validationResult.data;

    const result = await isFormatted(batchId);
    res.status(200).json({ isFormatted: result });
  } catch (e) {
    res.status(500).json({ error: 'Failed to check batch status' });
    return;
  }
};
