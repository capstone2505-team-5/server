import { Request, Response, RequestHandler } from 'express';
import {
  AnnotationNotFoundError,
  createNewAnnotation,
  deleteAnnotationById,
  getAllAnnotations,
  getAnnotationById,
  updateAnnotationById,
} from '../services/annotationService';
import {
  categorizeAnnotationsSchema,
  createAnnotationSchema,
  deleteAnnotationSchema,
  getAnnotationSchema,
  updateAnnotationSchema,
} from '../schemas/annotationSchemas';

import { categorizeBatch } from '../services/annotationCategorizationService';
import { rootSpanExists } from '../services/rootSpanService';

export const getAnnotations: RequestHandler = async (req: Request, res: Response) => {
  try {
    const mockAnnotations = await getAllAnnotations();
    res.json(mockAnnotations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch annotations' });
  }
};

export const getAnnotation: RequestHandler = async (req: Request, res: Response) => {
  try {
    const validationResult = getAnnotationSchema.safeParse(req);
    if (!validationResult.success) {
      res.status(400).json({ errors: validationResult.error.flatten() });
      return;
    }
    const { id } = validationResult.data.params;
    const annotation = await getAnnotationById(id);

    res.json(annotation);
  } catch (error) {
    if (error instanceof AnnotationNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch annotation' });
  }
};

export const createAnnotation: RequestHandler = async (req: Request, res: Response) => {
  try {
    const validationResult = createAnnotationSchema.safeParse(req);
    if (!validationResult.success) {
      res.status(400).json({ errors: validationResult.error.flatten() });
      return;
    }

    const { body } = validationResult.data;
    const { rootSpanId, note, rating } = body;

    // Business rule: 'bad' rating requires a non-empty note
    if (rating === 'bad' && (!note || note.trim() === '')) {
      res.status(400).json({ error: 'A note is required for a "bad" rating' });
      return;
    }

    if (!(await rootSpanExists(rootSpanId))) {
      res.status(404).json({ error: 'Root span not found.' });
      return;
    }

    const annotation = await createNewAnnotation(body);

    res.status(201).json(annotation);
  } catch (error) {
    console.error('Error in createAnnotation:', {
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ error: 'Failed to create annotation' });
  }
};

export const updateAnnotation: RequestHandler = async (req: Request, res: Response) => {
  try {
    const validationResult = updateAnnotationSchema.safeParse(req);
    if (!validationResult.success) {
      res.status(400).json({ errors: validationResult.error.flatten() });
      return;
    }

    const {
      params: { id },
      body,
    } = validationResult.data;
    const { note, rating } = body;

    // Business rule: 'bad' rating requires a non-empty note
    if (rating === 'bad' && (!note || note.trim() === '')) {
      res.status(400).json({ error: 'A note is required for a "bad" rating' });
      return;
    }

    const updatedAnnotation = await updateAnnotationById(id, body);

    res.json(updatedAnnotation);
  } catch (error) {
    if (error instanceof AnnotationNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to update annotation' });
  }
};

export const deleteAnnotation: RequestHandler = async (req: Request, res: Response) => {
  try {
    const validationResult = deleteAnnotationSchema.safeParse(req);
    if (!validationResult.success) {
      res.status(400).json({ errors: validationResult.error.flatten() });
      return;
    }
    const { id } = validationResult.data.params;
    // Find the annotation to delete
    const deletedAnnotation = await deleteAnnotationById(id);

    res.json({
      message: 'Annotation deleted successfully',
      deletedAnnotation,
    });
  } catch (error) {
    if (error instanceof AnnotationNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to delete annotation' });
  }
};

export const categorizeAnnotations: RequestHandler = async (req: Request, res: Response) => {
  try {
    const validationResult = categorizeAnnotationsSchema.safeParse(req);
    if (!validationResult.success) {
      res.status(400).json({ errors: validationResult.error.flatten() });
      return;
    }

    const { batchId } = validationResult.data.params;
    const result = await categorizeBatch(batchId);
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Categorization failed' });
  }
};
