import { Router } from "express";
import { 
    categorizeAnnotations, 
    getAnnotation, 
    createAnnotation, 
    getAnnotations, 
    deleteAnnotation, 
    updateAnnotation 
} from "../controllers/annotationController";
import { getRootSpan, getRootSpans } from "../controllers/rootSpanController";
import { getProjects } from "../controllers/projectController";
import { 
    removeSpanFromBatch, 
    getBatchlessSpans, 
    getBatchesByProject, 
    createBatch, getBatch, 
    updateBatch, 
    deleteBatch 
} from "../controllers/batchController";
import { getPhoenixDashboardUrl } from "../controllers/phoenixController";

const router = Router();

// ROOT SPAN ROUTES

// Get all rootSpans
router.get('/rootSpans', getRootSpans);

// Get a single root span by id
router.get('/rootSpans/:id', getRootSpan);

// ANNOTATIONS ROUTES

// Get all annotations
router.get('/annotations', getAnnotations);

// Get a single annotation by id
router.get('/annotations/:id', getAnnotation);

// Create a new annotation
router.post('/annotations', createAnnotation);

// Create categories, add to annotations, return categories and count of each
router.post('/categorize/:batchId', categorizeAnnotations);

// Patch a single annotation by id
router.patch('/annotations/:id', updateAnnotation);

// Delete a single annotation by id
router.delete('/annotations/:id', deleteAnnotation);

// PROJECT ROUTES

// Get all projects
router.get('/projects', getProjects);

// Get batch summaries for a project
router.get('/projects/:id', getBatchesByProject);

// BATCH ROUTES

// Params-> /api/batches/:batchId?pageNumber=1&numPerPage=20
// Get batch summary and root spans in bach
router.get('/batches/:id', getBatch);

// Get batchless spans by batch id
router.get('/batches/:id/edit', getBatchlessSpans);

// Create a new batch
router.post('/batches', createBatch);

// Update a single batch by id
router.patch('/batches/:id', updateBatch);

// Update a single batch by id
router.put('/batches/:id', updateBatch);

// Delete a single batch by id
router.delete('/batches/:id', deleteBatch);

// Remove a span from a batch (does not actually delete span from DB)
router.delete('/batches/:batchId/spans/:spanId', removeSpanFromBatch);

// PHOENIX ROUTES

// Get the Phoenix dashboard/API URL
router.get('/phoenixDashboardUrl', getPhoenixDashboardUrl);

export default router