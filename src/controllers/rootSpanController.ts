import { Request, Response } from "express";    
import { fetchEditBatchSpans, fetchRootSpans, getRootSpanById, RootSpanNotFoundError, fetchUniqueSpanNames, fetchRandomSpans } from "../services/rootSpanService";
import { FIRST_PAGE, DEFAULT_PAGE_QUANTITY, MAX_SPANS_PER_PAGE } from '../constants/index';
import { 
  getRootSpansSchema,
  getRootSpanSchema,
  getEditBatchSpansSchema,
  getUniqueSpanNamesSchema,
  getRandomSpansSchema,
} from '../schemas/rootSpanSchemas';

export const getRootSpans = async (req: Request, res: Response) => {
  const validation = getRootSpansSchema.safeParse(req);
  if (!validation.success) {
    res.status(400).json({ errors: validation.error.flatten() });
    return;
  }

  const {
    query: {
      batchId,
      projectId,
      spanName,
      pageNumber,
      numPerPage: numberPerPage,
      searchText,
      dateFilter,
      startDate,
      endDate,
    },
  } = validation.data;

  // Business rule kept in controller: require at least one of projectId or batchId
  if (!projectId && !batchId) {
    res.status(400).json( {error: "Either projectId or batchID is required"} );
    return;
  }

  try {
    const { rootSpans, totalCount } = await fetchRootSpans({
      batchId,
      projectId,
      spanName,
      pageNumber,
      numPerPage: numberPerPage,
      searchText,
      dateFilter,
      startDate,
      endDate,
    });

    res.json({ rootSpans, totalCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch root spans' });
  }
};


export const getRootSpan = async (req: Request, res: Response) => {
  const validation = getRootSpanSchema.safeParse(req);
  if (!validation.success) {
    res.status(400).json({ errors: validation.error.flatten() });
    return;
  }

  try {
    const { id: rootSpanId } = validation.data.params;

    const rootSpan = await getRootSpanById(rootSpanId)
    
    res.json(rootSpan);
  } catch (error) {
    if (error instanceof RootSpanNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: 'Failed to fetch root span' });
  }
};

export const getEditBatchSpans = async (req: Request, res: Response) => {
  const validation = getEditBatchSpansSchema.safeParse(req);
  if (!validation.success) {
    res.status(400).json({ errors: validation.error.flatten() });
    return;
  }

  try {
    const {
      query: {
        batchId,
        spanName,
        pageNumber,
        numPerPage: numberPerPage,
        searchText,
        dateFilter,
        startDate,
        endDate,
      },
    } = validation.data;
    
    const { rootSpans, totalCount } = await fetchEditBatchSpans({
      batchId,
      spanName,
      pageNumber,
      numPerPage: numberPerPage,
      searchText,
      dateFilter,
      startDate,
      endDate,
    });

    res.json({ editBatchRootSpans: rootSpans, totalCount });
  } catch (err) {
    console.error(`Error fetching spans for edit batch:`, err);
    res.status(500).json({ error: 'Failed to fetch spans to edit' });
  }
};

export const getUniqueSpanNames = async (req: Request, res: Response) => {
  const validation = getUniqueSpanNamesSchema.safeParse(req);
  if (!validation.success) {
    res.status(400).json({ errors: validation.error.flatten() });
    return;
  }

  try {
    const { projectId } = validation.data.params;

    const spanNames = await fetchUniqueSpanNames(projectId);
    res.json({ spanNames });
  } catch (err) {
    console.error(`Error fetching unique span names:`, err);
    res.status(500).json({ error: 'Failed to fetch unique span names' });
  }
};

export const getRandomSpans = async (req: Request, res: Response) => {
  const validation = getRandomSpansSchema.safeParse(req);
  if (!validation.success) {
    res.status(400).json({ errors: validation.error.flatten() });
    return;
  }

  try {
    const { projectId } = validation.data.params;

    const { rootSpans, totalCount } = await fetchRandomSpans({
      projectId,
    });

    res.json({ rootSpans, totalCount });
  } catch (err) {
    console.error(`Error fetching random spans:`, err);
    res.status(500).json({ error: 'Failed to fetch random spans' });
  }
};