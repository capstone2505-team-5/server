import { Request, Response } from "express";
import { AnnotationNotFoundError, createNewAnnotation, deleteAnnotationById, getAllAnnotations, getAnnotationById, updateAnnotationById } from '../services/annotationService';
import { CreateAnnotationRequest, Annotation } from "../types/types";

import { categorizeBadAnnotations } from '../services/annotationCategorizationService';
import { rootSpanExists } from "../services/rootSpanService";


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
  const { rootSpanId, note, rating }: CreateAnnotationRequest = req.body;
  try {
    // Validate required fields
    if (!rootSpanId || !rating) {
      res.status(400).json({ error: 'rootSpanId and rating are required' });
      return
    }
    
    // Validate required fields
    if (rating !== 'good' && rating !== 'bad') {
      res.status(400).json({ error: 'rating must be either "good" or "bad"' });
      return
    }

    if (rating === 'bad' && note === '') {
      res.status(400).json({ error: 'Note must be given on "bad" rating' });
      return
    }

    if (!await rootSpanExists(rootSpanId)) {
      res.status(404).json({ error: "Root span not found." })
      return
    }
    
    const annotation = await createNewAnnotation({ rootSpanId, note, rating })
        
    res.status(201).json(annotation);
  } catch (error) {
    console.error('Error in createAnnotation:', {
      rootSpanId,
      error: error instanceof Error ? error.message : error
    });
    res.status(500).json({ error: 'Failed to create annotation' });
  }
}

export const updateAnnotation = async (req: Request, res: Response) => {
  try {
    const { rating, note }: Annotation = req.body;
    
    // Validate that at least one field is provided for update
    if (!rating) {
      res.status(400).json({ error: 'rating is required for update' });
      return;
    }

    if (rating !== 'good' && rating !== 'bad') {
      res.status(400).json({ error: 'rating must be either "good" or "bad"' });
      return
    }

    if (rating === 'bad' && !note) {
      res.status(400).json({ error: 'Note must be given on "bad" rating' });
      return
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

export const categorizeAnnotations = async (_req: Request, res: Response) => {
  try {
    const result = await categorizeBadAnnotations();
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Categorization failed' });
  }
};
