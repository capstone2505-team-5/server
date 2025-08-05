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
exports.getRandomSpans = exports.getUniqueSpanNames = exports.getEditBatchSpans = exports.getRootSpan = exports.getRootSpans = void 0;
const rootSpanService_1 = require("../services/rootSpanService");
const getRootSpans = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const batchId = req.query.batchId;
    const projectId = req.query.projectId;
    const spanName = req.query.spanName;
    const pageNumber = req.query.pageNumber;
    const numberPerPage = req.query.numPerPage;
    const searchText = req.query.searchText;
    const dateFilter = req.query.dateFilter;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    if (!projectId && !batchId) {
        res.status(400).json({ error: "Either projectId or batchID is required" });
        return;
    }
    try {
        const { rootSpans, totalCount } = yield (0, rootSpanService_1.fetchRootSpans)({
            batchId,
            projectId,
            spanName,
            pageNumber,
            numberPerPage,
            searchText,
            dateFilter,
            startDate,
            endDate,
        });
        res.json({ rootSpans, totalCount });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch root spans' });
    }
});
exports.getRootSpans = getRootSpans;
const getRootSpan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rootSpanId = req.params.id;
        if (!rootSpanId) {
            res.status(400).json({ error: "rootSpanId is required" });
        }
        const rootSpan = yield (0, rootSpanService_1.getRootSpanById)(rootSpanId);
        res.json(rootSpan);
    }
    catch (error) {
        if (error instanceof rootSpanService_1.RootSpanNotFoundError) {
            res.status(404).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Failed to fetch root span' });
    }
});
exports.getRootSpan = getRootSpan;
const getEditBatchSpans = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const batchId = req.query.batchId;
        const spanName = req.query.spanName;
        const pageNumber = req.query.pageNumber;
        const numberPerPage = req.query.numPerPage;
        if (batchId === undefined) {
            res.status(400).json({ error: "batchId is required" });
            return;
        }
        const { rootSpans, totalCount } = yield (0, rootSpanService_1.fetchEditBatchSpans)({
            batchId,
            spanName,
            pageNumber,
            numberPerPage,
        });
        res.json({ editBatchRootSpans: rootSpans, totalCount });
    }
    catch (err) {
        console.error(`Error fetching spans for edit batch:`, err);
        res.status(500).json({ error: 'Failed to fetch spans to edit' });
    }
});
exports.getEditBatchSpans = getEditBatchSpans;
const getUniqueSpanNames = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const projectId = req.params.projectId;
        if (!projectId) {
            res.status(400).json({ error: "projectId is required" });
            return;
        }
        const spanNames = yield (0, rootSpanService_1.fetchUniqueSpanNames)(projectId);
        res.json({ spanNames });
    }
    catch (err) {
        console.error(`Error fetching unique span names:`, err);
        res.status(500).json({ error: 'Failed to fetch unique span names' });
    }
});
exports.getUniqueSpanNames = getUniqueSpanNames;
const getRandomSpans = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const projectId = req.params.projectId;
        if (!projectId) {
            res.status(400).json({ error: "projectId is required" });
            return;
        }
        const { rootSpans, totalCount } = yield (0, rootSpanService_1.fetchRandomSpans)({
            projectId,
        });
        res.json({ rootSpans, totalCount });
    }
    catch (err) {
        console.error(`Error fetching random spans:`, err);
        res.status(500).json({ error: 'Failed to fetch random spans' });
    }
});
exports.getRandomSpans = getRandomSpans;
