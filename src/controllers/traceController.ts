import { Request, Response } from "express";
import { mockTraces } from "../db/mockData";

export const getTraces = (req: Request, res: Response) => {
  try {
    res.json(mockTraces);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch traces' });
  }
}

export const getTrace = (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const trace = mockTraces.find(t => t.id === id);

    if (!trace) {
      res.status(404).json({ error: 'Trace not found' });
      return;
    }
    
    res.json(trace);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trace' });
  }
}