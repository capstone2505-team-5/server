"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.categorizeAnnotations = exports.deleteAnnotation = exports.updateAnnotation = exports.createAnnotation = exports.getAnnotation = exports.getAnnotations = void 0;
const annotationService_1 = require("../services/annotationService");
const annotationCategorizationService_1 = require("../services/annotationCategorizationService");
const rootSpanService_1 = require("../services/rootSpanService");
const getAnnotations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mockAnnotations = yield (0, annotationService_1.getAllAnnotations)();
        res.json(mockAnnotations);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch annotations' });
    }
});
exports.getAnnotations = getAnnotations;
const getAnnotation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const annotation = yield (0, annotationService_1.getAnnotationById)(req.params.id);
        res.json(annotation);
    }
    catch (error) {
        if (error instanceof annotationService_1.AnnotationNotFoundError) {
            res.status(404).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Failed to fetch annotation' });
    }
});
exports.getAnnotation = getAnnotation;
const createAnnotation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { rootSpanId, note, rating } = req.body;
    try {
        // Validate required fields
        if (!rootSpanId || !rating) {
            res.status(400).json({ error: 'rootSpanId and rating are required' });
            return;
        }
        // Validate required fields
        if (rating !== 'good' && rating !== 'bad') {
            res.status(400).json({ error: 'rating must be either "good" or "bad"' });
            return;
        }
        if (rating === 'bad' && note === '') {
            res.status(400).json({ error: 'Note must be given on "bad" rating' });
            return;
        }
        if (!(yield (0, rootSpanService_1.rootSpanExists)(rootSpanId))) {
            res.status(404).json({ error: "Root span not found." });
            return;
        }
        const annotation = yield (0, annotationService_1.createNewAnnotation)({ rootSpanId, note, rating });
        res.status(201).json(annotation);
    }
    catch (error) {
        console.error('Error in createAnnotation:', {
            rootSpanId,
            error: error instanceof Error ? error.message : error
        });
        res.status(500).json({ error: 'Failed to create annotation' });
    }
});
exports.createAnnotation = createAnnotation;
const updateAnnotation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { rating, note } = req.body;
        // Validate that at least one field is provided for update
        if (!rating) {
            res.status(400).json({ error: 'rating is required for update' });
            return;
        }
        if (rating !== 'good' && rating !== 'bad') {
            res.status(400).json({ error: 'rating must be either "good" or "bad"' });
            return;
        }
        if (rating === 'bad' && !note) {
            res.status(400).json({ error: 'Note must be given on "bad" rating' });
            return;
        }
        const updatedAnnotation = yield (0, annotationService_1.updateAnnotationById)(req.params.id, { note, rating });
        res.json(updatedAnnotation);
    }
    catch (error) {
        if (error instanceof annotationService_1.AnnotationNotFoundError) {
            res.status(404).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Failed to update annotation' });
    }
});
exports.updateAnnotation = updateAnnotation;
const deleteAnnotation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Find the annotation to delete
        const deletedAnnotation = yield (0, annotationService_1.deleteAnnotationById)(req.params.id);
        res.json({
            message: 'Annotation deleted successfully',
            deletedAnnotation
        });
    }
    catch (error) {
        if (error instanceof annotationService_1.AnnotationNotFoundError) {
            res.status(404).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Failed to delete annotation' });
    }
});
exports.deleteAnnotation = deleteAnnotation;
const categorizeAnnotations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const batchId = req.params.batchId;
        const result = yield (0, annotationCategorizationService_1.categorizeBatch)(batchId);
        res.status(201).json(result);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Categorization failed' });
    }
});
exports.categorizeAnnotations = categorizeAnnotations;
