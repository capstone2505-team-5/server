import { Router } from "express";
import { categorizeAnnotations, getAnnotation, createAnnotation, getAnnotations, deleteAnnotation, updateAnnotation } from "../controllers/annotationController";
import { getRootSpan, getRootSpans } from "../controllers/rootSpanController";
import { getProjects } from "../controllers/projectController";
import { getBatchlessSpans, getBatchesByProject, createBatch, getBatch, updateBatch, deleteBatch } from "../controllers/batchController";
import { getPhoenixDashboardUrl } from "../controllers/phoenixController";

// import from controllers here

const router = Router();

// // TRACES ROUTES

// // GET /api/traces - Get all traces
// router.get('/traces', getTraces);

// // GET /api/traces/:id - Get a single trace by id
// router.get('/traces/:id', getTrace);

// // DELETE /api/traces/:id - Delete a single trace by id
// router.delete('/traces/:id', deleteTrace);

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

router.get('/projects/:id', getBatchesByProject);

// BATCH ROUTES

// GET /api/batches/:batchId?pageNumber=1&numPerPage=20
// Get batch summary and root spans in bach
router.get('/batches/:id', getBatch);

// GET /api/batches/:id/edit - Get batchless spans by batch id
router.get('/batches/:id/edit', getBatchlessSpans);

// POST /api/batches - Create a new batch
router.post('/batches', createBatch);

// PATCH /api/batches/:id - Update a single batch by id
router.patch('/batches/:id', updateBatch);

// PUT /api/batches/:id - Update a single batch by id
router.put('/batches/:id', updateBatch);

// DELETE /api/batches/:id - Delete a single batch by id
router.delete('/batches/:id', deleteBatch);

// PHOENIX ROUTES

// GET /api/phoenix/dashboard-url - Get the Phoenix dashboard/API URL
router.get('/phoenixDashboardUrl', getPhoenixDashboardUrl);

export default router