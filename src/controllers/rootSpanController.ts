import { Request, Response } from "express";    
import { fetchEditBatchSpans, fetchRootSpans, getRootSpanById, RootSpanNotFoundError } from "../services/rootSpanService";
import { FIRST_PAGE, DEFAULT_PAGE_QUANTITY, MAX_SPANS_PER_PAGE } from '../constants/index';

export const getRootSpans = async (req: Request, res: Response) => {
  const batchId = req.query.batchId as string | undefined;
  const projectId = req.query.projectId as string | undefined;
  const spanName = req.query.spanName as string | undefined;
  const pageNumber = req.query.pageNumber as string | undefined;
  const numberPerPage = req.query.numPerPage as string | undefined;

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
      numberPerPage,
    });

    res.json({ rootSpans, totalCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch root spans' });
  }
};


export const getRootSpan = async (req: Request, res: Response) => {
  try {
    const rootSpanId = req.params.id;
    if (!rootSpanId) {
      res.status(400).json({error: "rootSpanId is required"});
    }

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
  try {
    const batchId = req.query.batchId as string | undefined;
    const projectId = req.query.projectId as string | undefined;
    const spanName = req.query.spanName as string | undefined;

    const pageNumber = parseInt(req.query.pageNumber as string) || FIRST_PAGE;
    const numberPerPage = parseInt(req.query.numPerPage as string) || DEFAULT_PAGE_QUANTITY;
    
    if (batchId === undefined) {
      res.status(400).json( {error: "batchId is required"} );
      return;
    }

    if (projectId === undefined) {
      res.status(400).json( {error: "projectId is required"} );
      return;
    }

    if (numberPerPage > MAX_SPANS_PER_PAGE) {
      res.status(400).json({error: `Max spans per page is ${MAX_SPANS_PER_PAGE}`})
    }

    const { rootSpans, totalCount } = await fetchEditBatchSpans({
      batchId,
      projectId,
      spanName,
      pageNumber,
      numberPerPage,
    });

    res.json({ editBatchRootSpans: rootSpans, totalCount });
  } catch (err) {
    console.error(`Error fetching spans for edit batch:`, err);
    res.status(500).json({ error: 'Failed to fetch spans to edit' });
  }
};