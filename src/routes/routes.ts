import { Router } from "express";
import { getTraces, getTrace, deleteTrace } from "../controllers/traceController";
import { categorizeAnnotations, getAnnotation, createAnnotation, getAnnotations, deleteAnnotation, updateAnnotation } from "../controllers/annotationController";
import { getRootSpan, getRootSpans } from "../controllers/rootSpanController";
import { getProjects } from "../controllers/projectController";
import { getQueues, createQueue, getQueue, updateQueue, deleteQueue } from "../controllers/queueController";

// import from controllers here

const router = Router();

// TRACES ROUTES

// GET /api/traces - Get all traces
router.get('/traces', getTraces);

// GET /api/traces/:id - Get a single trace by id
router.get('/traces/:id', getTrace);

// DELETE /api/traces/:id - Delete a single trace by id
router.delete('/traces/:id', deleteTrace);

// ROOT SPAN ROUTES

// GET /api/rootSpans - Get all rootSpans
router.get('/rootSpans', getRootSpans);

// GET /api/rootSpans/:id - Get a single root span by id
router.get('/rootSpans/:id', getRootSpan);


// ANNOTATIONS ROUTES

// GET /api/annotations - Get all annotations
router.get('/annotations', getAnnotations);

// GET /api/annotations/:id - Get a single annotation by id
router.get('/annotations/:id', getAnnotation);

// POST /api/annotations - Create a new annotation
router.post('/annotations', createAnnotation);

// POST /api/categorize - Create categories, add to annotations, return rootSpanId/categories
router.post('/categorize', categorizeAnnotations);

// Patch /api/annotations/:id - Patch a single annotation by id
router.patch('/annotations/:id', updateAnnotation);

// DELETE /api/annotation/:id - Delete a single annotation by id
router.delete('/annotations/:id', deleteAnnotation);

// PROJECT ROUTES
// GET /api/projects - Get all projects
router.get('/projects', getProjects);

// QUEUE ROUTES

// GET /api/queues - Get all queues
router.get('/queues', getQueues);

// POST /api/queues - Create a new queue
router.post('/queues', createQueue);

// GET /api/queues/:id - Get a single queue by id
router.get('/queues/:id', getQueue);

// PUT /api/queues/:id - Update a single queue by id
router.put('/queues/:id', updateQueue);

// DELETE /api/queues/:id - Delete a single queue by id
router.delete('/queues/:id', deleteQueue);

export default router