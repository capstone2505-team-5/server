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
exports.formatBatchByLLM = exports.removeSpanFromBatch = exports.deleteBatch = exports.updateBatch = exports.getBatch = exports.createBatch = exports.getBatchesByProject = void 0;
const batchService_1 = require("../services/batchService");
const errors_1 = require("../errors/errors");
const rootSpanService_1 = require("../services/rootSpanService");
const index_1 = require("../constants/index");
const getBatchesByProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const projectId = req.params.id;
        if (!projectId) {
            res.status(400).json({ error: 'projectId parameter is required' });
            return;
        }
        const batches = yield (0, batchService_1.getBatchSummariesByProject)(projectId);
        res.status(200).json(batches);
    }
    catch (err) {
        console.error('Error fetching batches:', err);
        res.status(500).json({ error: 'Failed to fetch batches' });
    }
});
exports.getBatchesByProject = getBatchesByProject;
const createBatch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, projectId, rootSpanIds } = req.body;
    if (!name || !projectId || !Array.isArray(rootSpanIds)) {
        res.status(400).json({ error: 'Request must include name and a rootSpanIds array' });
        return;
    }
    if (rootSpanIds.length > index_1.MAX_SPANS_PER_BATCH) {
        res.status(400).json({ error: `Maximum batch size is ${index_1.MAX_SPANS_PER_BATCH}` });
        return;
    }
    try {
        const batch = yield (0, batchService_1.createNewBatch)({ name, projectId, rootSpanIds });
        res.status(201).json(batch);
    }
    catch (err) {
        console.error('Error creating new batch:', err);
        res.status(500).json({ error: 'Failed to create new batch' });
    }
});
exports.createBatch = createBatch;
const getBatch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const projectId = undefined;
    const batchId = req.params.id;
    const spanName = req.query.spanName;
    const pageNumber = req.query.pageNumber;
    const numberPerPage = req.query.numPerPage;
    try {
        if (!batchId) {
            console.error("BatchId is required");
            res.status(400).json({ error: "Failed to get batch" });
            return;
        }
        const { rootSpans, totalCount } = yield (0, rootSpanService_1.fetchFormattedRootSpans)({
            batchId,
            projectId,
            spanName,
            pageNumber,
            numberPerPage,
        });
        const batchSummary = yield (0, batchService_1.getBatchSummaryById)(batchId);
        res.status(200).json({ rootSpans, batchSummary, totalCount });
    }
    catch (err) {
        if (err instanceof errors_1.BatchNotFoundError) {
            res.status(404).json({ error: err.message });
            return;
        }
        console.error(`Error fetching batch ${req.params.id}:`, err);
        res.status(500).json({ error: 'Failed to fetch batch' });
    }
});
exports.getBatch = getBatch;
const updateBatch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const batchId = req.params.id;
    const { name, rootSpanIds } = req.body;
    if (!batchId) {
        res.status(400).json({ error: "BatchId required to update batch" });
        return;
    }
    if (!name || !Array.isArray(rootSpanIds)) {
        res.status(400).json({ error: 'Request must include name and a rootSpanIds array' });
        return;
    }
    if (rootSpanIds.length > index_1.MAX_SPANS_PER_BATCH) {
        res.status(400).json({ error: `Maximum batch size is ${index_1.MAX_SPANS_PER_BATCH}` });
        return;
    }
    try {
        const updatedBatch = yield (0, batchService_1.updateBatchById)(batchId, { name, rootSpanIds });
        res.status(200).json(updatedBatch);
    }
    catch (err) {
        if (err instanceof errors_1.BatchNotFoundError) {
            res.status(404).json({ error: err.message });
            return;
        }
        console.error(`Error updating batch ${batchId}:`, err);
        res.status(500).json({ error: 'Failed to update batch' });
    }
});
exports.updateBatch = updateBatch;
const deleteBatch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const batchId = req.params.id;
    try {
        if (!batchId) {
            console.error("batchId query parameter is required to delete batch");
            res.status(400).json({ error: "Missing batchID query parameter" });
        }
        const deletedBatch = yield (0, batchService_1.deleteBatchById)(batchId);
        res.status(200).json({ message: 'Batch deleted successfully', deletedBatch });
    }
    catch (err) {
        if (err instanceof errors_1.BatchNotFoundError) {
            res.status(404).json({ error: err.message });
            return;
        }
        console.error(`Error deleting batch ${batchId}:`, err);
        res.status(500).json({ error: 'Failed to delete batch' });
    }
});
exports.deleteBatch = deleteBatch;
const removeSpanFromBatch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const batchId = req.params.batchId;
    const spanId = req.params.spanId;
    if (!batchId || !spanId) {
        res.status(400).json({ error: "spanId and batchId required" });
        return;
    }
    try {
        const spanRemoved = yield (0, rootSpanService_1.nullifyBatchId)(spanId, batchId);
        if (!spanRemoved) {
            res.status(404).json({ error: "Span not found in batch" });
        }
        res.status(200).json({ message: `Span removed from batch ${batchId}` });
    }
    catch (e) {
        console.error("Unable to remove span from batch", e);
        res.status(500).json({ error: "Failed to remove span from batch" });
        return;
    }
});
exports.removeSpanFromBatch = removeSpanFromBatch;
const formatBatchByLLM = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const batchId = req.params.batchId;
        if (batchId === undefined)
            throw new Error("missing batchId");
        yield (0, batchService_1.formatBatch)(batchId);
        res.status(200).json({ message: "success" });
    }
    catch (e) {
        console.error(e);
        throw e;
    }
});
exports.formatBatchByLLM = formatBatchByLLM;
