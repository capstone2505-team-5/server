import { Router } from "express";
import { categorizeTraces, getTraces, getTrace, deleteTrace } from "../controllers/traceController";
import { getAnnotation, createAnnotation, getAnnotations, deleteAnnotation, updateAnnotation } from "../controllers/annotationController";

// import from controllers here

const router = Router()

// TRACES ROUTES

// GET /api/traces - Get all traces
router.get('/traces', getTraces);

// GET /api/traces/:id - Get a single trace by id
router.get('/traces/:id', getTrace);

// DELETE /api/traces/:id - Delete a single trace by id
router.delete('/traces/:id', deleteTrace)


// ANNOTATIONS ROUTES

// GET /api/annotations - Get all annotations
router.get('/annotations', getAnnotations)

// GET /api/annotations/:id - Get a single annotation by id
router.get('/annotations/:id', getAnnotation);

// POST /api/annotations - Create a new annotation
router.post('/annotations', createAnnotation);

// POST /api/categorize - Create categories, add to annotations, return traceId/categories
router.post('/categorize', categorizeTraces);

// Patch /api/annotations/:id - Patch a single annotation by id
router.patch('/annotations/:id', updateAnnotation);

// DELETE /api/annotation/:id - Delete a single annotation by id
router.delete('/annotations/:id', deleteAnnotation)


export default router