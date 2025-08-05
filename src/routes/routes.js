"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const annotationController_1 = require("../controllers/annotationController");
const rootSpanController_1 = require("../controllers/rootSpanController");
const projectController_1 = require("../controllers/projectController");
const batchController_1 = require("../controllers/batchController");
const phoenixController_1 = require("../controllers/phoenixController");
const sseController_1 = require("../controllers/sseController");
const router = (0, express_1.Router)();
// ROOT SPAN ROUTES
// Get all rootSpans
// Params -> /api/rootSpans?projectId=123&batchId=123&spanName=myFunction&pageNumber=1&numPerPage=20
router.get('/rootSpans', rootSpanController_1.getRootSpans);
// Get a single root span by id
router.get('/rootSpans/:id', rootSpanController_1.getRootSpan);
// Get unique span names for a project
router.get('/projects/:projectId/spanNames', rootSpanController_1.getUniqueSpanNames);
// Get random spans for a project
router.get('/projects/:projectId/randomSpans', rootSpanController_1.getRandomSpans);
// ANNOTATIONS ROUTES
// Get all annotations
router.get('/annotations', annotationController_1.getAnnotations);
// Get a single annotation by id
router.get('/annotations/:id', annotationController_1.getAnnotation);
// Create a new annotation
router.post('/annotations', annotationController_1.createAnnotation);
// Create categories, add to annotations, return categories and count of each
router.post('/categorize/:batchId', annotationController_1.categorizeAnnotations);
// Patch a single annotation by id
router.patch('/annotations/:id', annotationController_1.updateAnnotation);
// Delete a single annotation by id
router.delete('/annotations/:id', annotationController_1.deleteAnnotation);
// PROJECT ROUTES
// Get all projects
router.get('/projects', projectController_1.getProjects);
// Get batch summaries for a project
router.get('/projects/:id', batchController_1.getBatchesByProject);
// BATCH ROUTES
// Get batchless spans and spans from the batch
// Params-> /api/batches/edit?batchId=123&spanName=myFunction&pageNumber=1&numPerPage=20
router.get('/batches/edit', rootSpanController_1.getEditBatchSpans);
// Params-> /api/batches/:batchId?pageNumber=1&numPerPage=20
// Get batch summary and root spans in batch
router.get('/batches/:id', batchController_1.getBatch);
// Create a new batch
router.post('/batches', batchController_1.createBatch);
// Update a single batch by id
router.patch('/batches/:id', batchController_1.updateBatch);
// Update a single batch by id
router.put('/batches/:id', batchController_1.updateBatch);
// Delete a single batch by id
router.delete('/batches/:id', batchController_1.deleteBatch);
// Remove a span from a batch (does not actually delete span from DB)
router.delete('/batches/:batchId/spans/:spanId', batchController_1.removeSpanFromBatch);
// Format a batch
router.post('/batches/:batchId/format', batchController_1.formatBatchByLLM);
// PHOENIX ROUTES
// Get the Phoenix dashboard/API URL
router.get('/phoenixDashboardUrl', phoenixController_1.getPhoenixDashboardUrl);
// SSE ROUTES
// SSE connection for batch formatting updates  
router.get('/batches/:id/events', sseController_1.connectToBatchEvents);
exports.default = router;
