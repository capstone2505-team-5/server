import { Request, Response } from "express";
import { mockAnnotations, mockTraces } from "../db/mockData";
import { CreateAnnotationRequest, Annotation, Rating } from "../types/types";

export const getAnnotations = (req: Request, res: Response) => {
  try {
    res.json(mockAnnotations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch annotations' });
  }
}

export const getAnnotation = (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const annotation = mockAnnotations.find(a => a.id === id);
    
    if (!annotation) {
      res.status(404).json({ error: 'Annotation not found' });
      return;
    }
    
    res.json(annotation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch annotation' });
  }
}

export const createAnnotation = (req: Request, res: Response) => {
  try {
    const { traceId, note, rating = 'none' }: CreateAnnotationRequest = req.body;
    
    // Validate required fields
    if (!traceId || !note) {
      res.status(400).json({ error: 'traceId and note are required' });
      return
    }
    
    // Check if trace exists
    const traceExists = mockTraces.find(t => t.id === traceId);
    if (!traceExists) {
      res.status(404).json({ error: 'Trace not found' });
      return
    }
    
    // Create new annotation (mock implementation)
    const newAnnotation: Annotation = {
      id: (mockAnnotations.length + 1).toString(),
      traceId: traceId,
      note,
      rating,
      categories: [] // You might want to add logic to determine categories
    };
    
    mockAnnotations.push(newAnnotation);
    
    res.status(201).json(newAnnotation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create annotation' });
  }
}