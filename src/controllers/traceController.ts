import { Request, Response } from "express";
import { mockTraces } from "../db/mockData";

export const getTraces = (req: Request, res: Response) => {
  try {
    res.json(mockTraces);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch traces' });
  }
};

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
};

export const deleteTrace = (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    // Find the trace to delete
    const traceIndex = mockTraces.findIndex(a => a.id === id);
    
    if (traceIndex === -1) {
      res.status(404).json({ error: 'Trace not found' });
      return;
    }
    
    // Remove the trace from the array
    const deletedTrace = mockTraces.splice(traceIndex, 1)[0];
    
    res.json({ 
      message: 'Trace deleted successfully',
      deletedTrace 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete trace' });
  }
}

export const categorizeTraces = (req: Request, res: Response) => {
  const result = [
    {traceId: "SYN018", categories: ["spelling", "speed"]},
    {traceId: "SYN019", categories: ["spelling", "attitude"]},
    {traceId: "SYN021", categories: ["spelling", "speed"]},
    {traceId: "SYN008", categories: ["speed"]},
  ];
  res.json(result);
};