import { Request, Response } from "express";
import { deleteTraceById, getAllTraces, getTraceById, TraceNotFoundError } from "../services/traceService";


export const getTraces = async (req: Request, res: Response) => {
  try {
    const traces = await getAllTraces()
    res.json(traces);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch traces' });
  }
};

export const getTrace = async (req: Request, res: Response) => {
  try {
    const trace = await getTraceById(req.params.id)
    
    res.json(trace);
  } catch (error) {
    if (error instanceof TraceNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: 'Failed to fetch trace' });
  }
};

export const deleteTrace = async (req: Request, res: Response) => {
  try {
    const deletedTrace = await deleteTraceById(req.params.id)
    
    res.json({ 
      message: 'Trace deleted successfully',
      deletedTrace 
    });
  } catch (error) {
    if (error instanceof TraceNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: 'Failed to delete trace' });
  }
}
