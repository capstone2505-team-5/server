import { Request, Response } from "express";    
import { getAllRootSpans, getRootSpanById, RootSpanNotFoundError } from "../services/rootSpanService";


export const getRootSpans = async (req: Request, res: Response) => {
  try {
    const batchId = req.query.batchId as string | undefined;
    const projectId = req.query.projectId as string | undefined;

    const rootSpans = await getAllRootSpans({ batchId, projectId })
    res.json(rootSpans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch root spans' });
  }
};

export const getRootSpan = async (req: Request, res: Response) => {
  try {
    const rootSpan = await getRootSpanById(req.params.id)
    
    res.json(rootSpan);
  } catch (error) {
    if (error instanceof RootSpanNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: 'Failed to fetch root span' });
  }
};