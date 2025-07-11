import { Request, Response } from "express";
import { getAllAnnotations } from '../services/annotationService';
import { mockTraces } from "../db/mockData";
import { CreateAnnotationRequest, Annotation, Rating } from "../types/types";

export const getAnnotations = (req: Request, res: Response) => {
  try {
    const mockAnnotations = getAllAnnotations();
    res.json(mockAnnotations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch annotations' });
  }
}

export const getAnnotation = (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    // should replace this with a service to get the annotation
    const mockAnnotations: Annotation[] = getAllAnnotations();

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

    // should replace this with a service to get next ID probably
    const mockAnnotations: Annotation[] = getAllAnnotations();
    
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

export const updateAnnotation = (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { note, rating }: Annotation = req.body;
    
    // Find the annotation to update
    const mockAnnotations: Annotation[] = getAllAnnotations();
    const annotationIndex = mockAnnotations.findIndex(a => a.id === id);
    
    if (annotationIndex === -1) {
      res.status(404).json({ error: 'Annotation not found' });
      return;
    }
    
    // Validate that at least one field is provided for update
    if (!note && !rating) {
      res.status(400).json({ error: 'At least one field (note or rating) is required for update' });
      return;
    }
    
    // Update the annotation with provided fields
    // This will be moved to services and have category involved later.
    const updatedAnnotation: Annotation = {
      ...mockAnnotations[annotationIndex],
      ...(note && { note }),
      ...(rating && { rating })
    };
    
    mockAnnotations[annotationIndex] = updatedAnnotation;
    
    res.json(updatedAnnotation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update annotation' });
  }
}

export const deleteAnnotation = (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    // Find the annotation to delete
    const mockAnnotations: Annotation[] = getAllAnnotations();
    const annotationIndex = mockAnnotations.findIndex(a => a.id === id);
    
    if (annotationIndex === -1) {
      res.status(404).json({ error: 'Annotation not found' });
      return;
    }
    
    // Remove the annotation from the array
    const deletedAnnotation = mockAnnotations.splice(annotationIndex, 1)[0];
    
    res.json({ 
      message: 'Annotation deleted successfully',
      deletedAnnotation 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete annotation' });
  }
}