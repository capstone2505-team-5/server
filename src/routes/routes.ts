import { Router } from "express";
import { getSpans, getSpan, deleteSpan } from "../controllers/traceController";
import { categorizeAnnotations, getAnnotation, createAnnotation, getAnnotations, deleteAnnotation, updateAnnotation } from "../controllers/annotationController";

// import from controllers here

const router = Router()

// TRACES ROUTES

// GET /api/spans - Get all spans
router.get('/spans', getSpans);

// GET /api/spans/:id - Get a single span by id
router.get('/spans/:id', getSpan);

// DELETE /api/traces/:id - Delete a single span by id
router.delete('/spans/:id', deleteSpan)


// ANNOTATIONS ROUTES

// GET /api/annotations - Get all annotations
router.get('/annotations', getAnnotations)

// GET /api/annotations/:id - Get a single annotation by id
router.get('/annotations/:id', getAnnotation);

// POST /api/annotations - Create a new annotation
router.post('/annotations', createAnnotation);

// POST /api/categorize - Create categories, add to annotations, return spanId/categories
router.post('/categorize', categorizeAnnotations);

// Patch /api/annotations/:id - Patch a single annotation by id
router.patch('/annotations/:id', updateAnnotation);

// DELETE /api/annotation/:id - Delete a single annotation by id
router.delete('/annotations/:id', deleteAnnotation)


export default router