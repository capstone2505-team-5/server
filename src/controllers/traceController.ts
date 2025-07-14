import { Request, Response } from "express";
import { deleteSpanById, getAllSpans, getSpanById, SpanNotFoundError } from "../services/traceService";


export const getSpans = async (req: Request, res: Response) => {
  try {
    const spans = await getAllSpans()
    res.json(spans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch spans' });
  }
};

export const getSpan = async (req: Request, res: Response) => {
  try {
    const trace = await getSpanById(req.params.id)
    
    res.json(trace);
  } catch (error) {
    if (error instanceof SpanNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: 'Failed to fetch span' });
  }
};

export const deleteSpan = async (req: Request, res: Response) => {
  try {
    const deletedSpan = await deleteSpanById(req.params.id)
    
    res.json({ 
      message: 'Span deleted successfully',
      deletedSpan 
    });
  } catch (error) {
    if (error instanceof SpanNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: 'Failed to delete span' });
  }
}
