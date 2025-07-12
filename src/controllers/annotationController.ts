import { Request, Response } from "express";
import { AnnotationNotFoundError, createNewAnnotation, deleteAnnotationById, getAllAnnotations, getAnnotationById, updateAnnotationById } from '../services/annotationService';
import { CreateAnnotationRequest, Annotation, Rating } from "../types/types";
import { getAllTraces } from "../services/traceService";

export const getAnnotations = async (req: Request, res: Response) => {
  try {
    const mockAnnotations = await getAllAnnotations();
    res.json(mockAnnotations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch annotations' });
  }
}

export const getAnnotation = async (req: Request, res: Response) => {
  try {
    const annotation: Annotation = await getAnnotationById(req.params.id)
    
    res.json(annotation);
  } catch (error) {
    if (error instanceof AnnotationNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch annotation' });
  }
}

export const createAnnotation = async (req: Request, res: Response) => {
  try {
    const { traceId, note, rating = 'none' }: CreateAnnotationRequest = req.body;
    
    // Validate required fields
    if (!traceId || !note) {
      res.status(400).json({ error: 'traceId and note are required' });
      return
    }
    
    // Check if trace exists
    const traces = await getAllTraces()

    const traceExists = traces.find(t => t.id === traceId);
    if (!traceExists) {
      res.status(404).json({ error: 'Trace not found' });
      return
    }

    // should replace this with a service to get next ID probably
    const annotation = await createNewAnnotation({traceId, note, rating})
        
    res.status(201).json(annotation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create annotation' });
  }
}

export const updateAnnotation = async (req: Request, res: Response) => {
  try {
    const { note, rating }: Annotation = req.body;
    
    // Validate that at least one field is provided for update
    if (!note && !rating) {
      res.status(400).json({ error: 'At least one field (note or rating) is required for update' });
      return;
    }
    const updatedAnnotation = await updateAnnotationById(req.params.id, {note, rating})
    
    res.json(updatedAnnotation);
  } catch (error) {
    if (error instanceof AnnotationNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to update annotation' });
  }
}

export const deleteAnnotation = async (req: Request, res: Response) => {
  try {    
    // Find the annotation to delete
    const deletedAnnotation = await deleteAnnotationById(req.params.id);
        
    res.json({ 
      message: 'Annotation deleted successfully',
      deletedAnnotation 
    });
  } catch (error) {
    if (error instanceof AnnotationNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to delete annotation' });
  }
}