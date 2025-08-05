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
exports.fetchRandomSpans = exports.fetchUniqueSpanNames = exports.fetchFormattedRootSpans = exports.insertFormattedSpanSets = exports.fetchEditBatchSpans = exports.nullifyBatchId = exports.rootSpanExists = exports.getRootSpanById = exports.fetchRootSpans = exports.RootSpanNotFoundError = void 0;
const console_1 = require("console");
const postgres_1 = require("../db/postgres");
const index_1 = require("../constants/index");
class RootSpanNotFoundError extends Error {
    constructor(id) {
        super(`Root Span with id ${id} not found`);
        this.name = 'RootSpanNotFoundError';
    }
}
exports.RootSpanNotFoundError = RootSpanNotFoundError;
const fetchRootSpans = (_a) => __awaiter(void 0, [_a], void 0, function* ({ batchId, projectId, spanName, pageNumber, numberPerPage, searchText, dateFilter, startDate, endDate, }) {
    const pageNum = parseInt(pageNumber) || index_1.FIRST_PAGE;
    const numPerPage = parseInt(numberPerPage) || index_1.DEFAULT_PAGE_QUANTITY;
    // Validate pagination input
    if (pageNum < 1 || !Number.isInteger(pageNum)) {
        throw new Error(`Invalid page number: ${pageNum}`);
    }
    if (numPerPage < 1 || numPerPage > index_1.MAX_SPANS_PER_PAGE || !Number.isInteger(numPerPage)) {
        throw new Error(`Page number must be a number between ${index_1.FIRST_PAGE} and ${index_1.MAX_SPANS_PER_PAGE}`);
    }
    if (!projectId && !batchId) {
        throw new Error("Either projectId or batchID is required");
    }
    try {
        const whereClauses = [];
        const params = [];
        // if batchId is undefined, show only batchless spans
        if (!batchId) {
            whereClauses.push(`r.batch_id IS NULL`);
        }
        else if (batchId !== undefined) {
            params.push(batchId);
            whereClauses.push(`r.batch_id = $${params.length}`);
        }
        if (projectId) {
            params.push(projectId);
            whereClauses.push(`r.project_id = $${params.length}`);
        }
        if (spanName) {
            params.push(spanName);
            whereClauses.push(`r.span_name = $${params.length}`);
        }
        // Add text search filtering
        if (searchText && searchText.trim()) {
            params.push(`%${searchText.trim()}%`);
            whereClauses.push(`(r.input ILIKE $${params.length} OR r.output ILIKE $${params.length})`);
        }
        // Add date filtering
        if (dateFilter && dateFilter !== 'all') {
            let dateCondition = '';
            switch (dateFilter) {
                case '12h':
                    dateCondition = `r.start_time >= NOW() - INTERVAL '12 hours'`;
                    break;
                case '24h':
                    dateCondition = `r.start_time >= NOW() - INTERVAL '24 hours'`;
                    break;
                case '1w':
                    dateCondition = `r.start_time >= NOW() - INTERVAL '1 week'`;
                    break;
                case 'custom':
                    if (startDate && endDate) {
                        params.push(startDate, endDate);
                        // Use DATE() to compare just the date part, and make end date inclusive of full day
                        dateCondition = `DATE(r.start_time) >= DATE($${params.length - 1}) AND DATE(r.start_time) <= DATE($${params.length})`;
                    }
                    break;
            }
            if (dateCondition) {
                whereClauses.push(dateCondition);
            }
        }
        const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
        const offset = (pageNum - 1) * numPerPage;
        params.push(numPerPage, offset);
        const query = `
      SELECT 
        r.id AS root_span_id,
        r.trace_id,
        r.batch_id,
        r.input,
        r.output,
        r.project_id,
        r.span_name,
        r.start_time,
        r.end_time,
        r.created_at,
        a.id AS annotation_id,
        a.note,
        a.rating,
        COALESCE(array_agg(c.text) FILTER (WHERE c.text IS NOT NULL), '{}') AS categories
      FROM root_spans r
      LEFT JOIN annotations a ON r.id = a.root_span_id
      LEFT JOIN annotation_categories ac ON a.id = ac.annotation_id
      LEFT JOIN categories c ON ac.category_id = c.id
      ${whereSQL}
      GROUP BY 
        r.id, r.trace_id, r.batch_id, r.input, r.output, 
        r.project_id, r.span_name, r.start_time, 
        r.end_time, r.created_at,
        a.id, a.note, a.rating
      ORDER BY r.created_at DESC, r.id ASC
      LIMIT $${params.length - 1}
      OFFSET $${params.length};
    `;
        const countQuery = `
      SELECT COUNT(*) FROM root_spans r
      ${whereSQL}
    `;
        const [dataResult, countResult] = yield Promise.all([
            postgres_1.pool.query(query, params),
            postgres_1.pool.query(countQuery, params.slice(0, params.length - 2)), // exclude limit/offset
        ]);
        const rootSpans = dataResult.rows.map(row => {
            var _a, _b, _c;
            return ({
                id: row.root_span_id,
                traceId: row.trace_id,
                batchId: row.batch_id,
                input: row.input,
                output: row.output,
                projectId: row.project_id,
                spanName: row.span_name,
                startTime: row.start_time,
                endTime: row.end_time,
                createdAt: row.created_at,
                annotation: row.annotation_id
                    ? {
                        id: row.annotation_id,
                        note: (_a = row.note) !== null && _a !== void 0 ? _a : "", // fallback
                        rating: (_b = row.rating) !== null && _b !== void 0 ? _b : "bad", // fallback to valid Rating
                        categories: (_c = row.categories) !== null && _c !== void 0 ? _c : [], // fallback
                    }
                    : null,
            });
        });
        return {
            rootSpans,
            totalCount: parseInt(countResult.rows[0].count, 10),
        };
    }
    catch (error) {
        console.error("Error in fetchRootSpans:", error);
        throw new Error("Failed to fetch root spans from the database");
    }
});
exports.fetchRootSpans = fetchRootSpans;
const getRootSpanById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = `
      SELECT 
        r.id AS root_span_id,
        r.trace_id,
        r.batch_id,
        r.input,
        r.output,
        r.project_id,
        r.span_name,
        r.start_time,
        r.end_time,
        r.created_at,

        a.id AS annotation_id,
        a.note,
        a.rating,

        COALESCE(array_agg(c.text) FILTER (WHERE c.text IS NOT NULL), '{}') AS categories

      FROM root_spans r
      LEFT JOIN annotations a ON r.id = a.root_span_id
      LEFT JOIN annotation_categories ac ON a.id = ac.annotation_id
      LEFT JOIN categories c ON ac.category_id = c.id

      WHERE r.id = $1

      GROUP BY 
        r.id, r.trace_id, r.batch_id, r.input, r.output, 
        r.project_id, r.span_name, r.start_time, r.end_time, r.created_at,
        a.id, a.note, a.rating;
    `;
        const result = yield postgres_1.pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new RootSpanNotFoundError(id);
        }
        const row = result.rows[0];
        const annotatedRootSpan = {
            id: row.root_span_id,
            traceId: row.trace_id,
            batchId: row.batch_id,
            input: row.input,
            output: row.output,
            projectId: row.project_id,
            spanName: row.span_name,
            startTime: row.start_time,
            endTime: row.end_time,
            createdAt: row.created_at,
            annotation: row.annotation_id
                ? {
                    id: row.annotation_id,
                    note: row.note,
                    rating: row.rating,
                    categories: row.categories,
                }
                : null,
        };
        return annotatedRootSpan;
    }
    catch (error) {
        console.error(`Error fetching root span with id ${id}:`, error);
        if (error instanceof RootSpanNotFoundError) {
            throw error;
        }
        throw new Error(`Database error while fetching root span with id ${id}`);
    }
});
exports.getRootSpanById = getRootSpanById;
const rootSpanExists = (spanId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const result = yield postgres_1.pool.query(`
        SELECT 1 FROM root_spans
        WHERE id = $1
      `, [spanId]);
        return ((_a = result.rowCount) !== null && _a !== void 0 ? _a : 0) > 0;
    }
    catch (e) {
        console.error("Database query failed in rootSpanExists:", {
            spanId,
            error: console_1.error instanceof Error ? console_1.error.message : console_1.error
        });
        throw new Error("Failed to check root span existence");
    }
});
exports.rootSpanExists = rootSpanExists;
const nullifyBatchId = (spanId, batchId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const query = `
      UPDATE root_spans
      SET batch_id = NULL
      WHERE id = $1 AND batch_id = $2
    `;
        const result = yield postgres_1.pool.query(query, [spanId, batchId]);
        return ((_a = result.rowCount) !== null && _a !== void 0 ? _a : 0) > 0;
    }
    catch (e) {
        console.error("Database failed to nullify batchId");
        throw new Error("Span not removed from batch");
    }
});
exports.nullifyBatchId = nullifyBatchId;
const fetchEditBatchSpans = (_a) => __awaiter(void 0, [_a], void 0, function* ({ batchId, spanName, pageNumber, numberPerPage, }) {
    const pageNum = parseInt(pageNumber) || index_1.FIRST_PAGE;
    const numPerPage = parseInt(numberPerPage) || index_1.DEFAULT_PAGE_QUANTITY;
    try {
        // Validate pagination input
        if (pageNum < 1 || !Number.isInteger(pageNum)) {
            throw new Error(`Invalid pageNum: ${pageNum}`);
        }
        if (numPerPage < 1 || numPerPage > index_1.MAX_SPANS_PER_PAGE || !Number.isInteger(numPerPage)) {
            throw new Error(`Invalid numPerPage: ${numPerPage}`);
        }
        const whereClauses = [];
        const params = [];
        if (batchId === undefined) {
            throw new Error("batchId required");
        }
        else {
            params.push(batchId);
            whereClauses.push(`r.batch_id = $${params.length} OR r.batch_id IS NULL`);
        }
        const projectId = yield getProjectIdFromBatch(batchId);
        if (projectId === undefined) {
            throw new Error("Error fetching projectID from batchId");
        }
        else {
            params.push(projectId);
            whereClauses.push(`r.project_id = $${params.length}`);
        }
        if (spanName) {
            params.push(spanName);
            whereClauses.push(`r.span_name = $${params.length}`);
        }
        const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
        const offset = (pageNum - 1) * numPerPage;
        params.push(numPerPage, offset);
        const query = `
      SELECT 
        r.id AS root_span_id,
        r.trace_id,
        r.batch_id,
        r.input,
        r.output,
        r.project_id,
        r.span_name,
        r.start_time,
        r.end_time,
        r.created_at,
        a.id AS annotation_id,
        a.note,
        a.rating,
        COALESCE(array_agg(c.text) FILTER (WHERE c.text IS NOT NULL), '{}') AS categories
      FROM root_spans r
      LEFT JOIN annotations a ON r.id = a.root_span_id
      LEFT JOIN annotation_categories ac ON a.id = ac.annotation_id
      LEFT JOIN categories c ON ac.category_id = c.id
      ${whereSQL}
      GROUP BY 
        r.id, r.trace_id, r.batch_id, r.input, r.output, 
        r.project_id, r.span_name, r.start_time, 
        r.end_time, r.created_at,
        a.id, a.note, a.rating
      ORDER BY r.created_at DESC, r.id ASC
      LIMIT $${params.length - 1}
      OFFSET $${params.length};
    `;
        const countQuery = `
      SELECT COUNT(*) FROM root_spans r
      ${whereSQL}
    `;
        const [dataResult, countResult] = yield Promise.all([
            postgres_1.pool.query(query, params),
            postgres_1.pool.query(countQuery, params.slice(0, params.length - 2)), // exclude limit/offset
        ]);
        const rootSpans = dataResult.rows.map(row => {
            var _a, _b, _c;
            return ({
                id: row.root_span_id,
                traceId: row.trace_id,
                batchId: row.batch_id,
                input: row.input,
                output: row.output,
                projectId: row.project_id,
                spanName: row.span_name,
                startTime: row.start_time,
                endTime: row.end_time,
                createdAt: row.created_at,
                annotation: row.annotation_id
                    ? {
                        id: row.annotation_id,
                        note: (_a = row.note) !== null && _a !== void 0 ? _a : "", // fallback
                        rating: (_b = row.rating) !== null && _b !== void 0 ? _b : "bad", // fallback to valid Rating
                        categories: (_c = row.categories) !== null && _c !== void 0 ? _c : [], // fallback
                    }
                    : null,
            });
        });
        return {
            rootSpans,
            totalCount: parseInt(countResult.rows[0].count, 10),
        };
    }
    catch (error) {
        console.error("Error in getAllRootSpans:", error);
        throw new Error("Failed to fetch root spans from the database");
    }
});
exports.fetchEditBatchSpans = fetchEditBatchSpans;
const insertFormattedSpanSets = (formattedSpanSets) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Build the VALUES clause with placeholders
        const valuesClauses = [];
        const params = [];
        formattedSpanSets.forEach((spanSet, index) => {
            const baseIndex = index * 3;
            valuesClauses.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`);
            params.push(spanSet.spanId, spanSet.formattedInput, spanSet.formattedOutput);
        });
        // FROM clause joins and updates in one operations
        const query = `
      UPDATE root_spans 
      SET 
        formatted_input = updates.formatted_input,
        formatted_output = updates.formatted_output,
        formatting_status = 'completed',
        formatted_at = NOW()
      FROM (VALUES ${valuesClauses.join(', ')}) 
      AS updates(span_id, formatted_input, formatted_output)
      WHERE root_spans.id = updates.span_id
    `;
        const result = yield postgres_1.pool.query(query, params);
        return { updated: result.rowCount || 0 };
    }
    catch (e) {
        console.error("failed to insert formatted inputs and outputs into database", e);
        throw e;
    }
});
exports.insertFormattedSpanSets = insertFormattedSpanSets;
const getProjectIdFromBatch = (batchId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = `
      SELECT project_id 
      FROM batches
      WHERE batches.id = $1
    `;
        const result = yield postgres_1.pool.query(query, [batchId]);
        if (!result.rowCount || result.rowCount < 1) {
            throw new Error(`cannot find project_id from batch ${batchId}`);
        }
        return result.rows[0].project_id;
    }
    catch (e) {
        console.error(e);
        throw e;
    }
});
const fetchFormattedRootSpans = (_a) => __awaiter(void 0, [_a], void 0, function* ({ batchId, spanName, pageNumber, numberPerPage, }) {
    try {
        const pageNum = parseInt(pageNumber) || index_1.FIRST_PAGE;
        const numPerPage = parseInt(numberPerPage) || index_1.DEFAULT_PAGE_QUANTITY;
        // Validate pagination input
        if (pageNum < 1 || !Number.isInteger(pageNum)) {
            throw new Error(`Invalid page number: ${pageNum}`);
        }
        if (numPerPage < 1 || numPerPage > index_1.MAX_SPANS_PER_PAGE || !Number.isInteger(numPerPage)) {
            throw new Error(`Page number must be a number between ${index_1.FIRST_PAGE} and ${index_1.MAX_SPANS_PER_PAGE}`);
        }
        if (!batchId) {
            throw new Error("batchID is required");
        }
        const whereClauses = [];
        const params = [];
        // if batchId is undefined, show only batchless spans
        if (!batchId) {
            whereClauses.push(`r.batch_id IS NULL`);
        }
        else if (batchId !== undefined) {
            params.push(batchId);
            whereClauses.push(`r.batch_id = $${params.length}`);
        }
        if (spanName) {
            params.push(spanName);
            whereClauses.push(`r.span_name = $${params.length}`);
        }
        const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
        const offset = (pageNum - 1) * numPerPage;
        params.push(numPerPage, offset);
        const query = `
      SELECT 
        r.id AS root_span_id,
        r.trace_id,
        r.batch_id,
        r.input,
        r.output,
        r.project_id,
        r.span_name,
        r.start_time,
        r.end_time,
        r.created_at,
        r.formatted_input,
        r.formatted_output,
        a.id AS annotation_id,
        a.note,
        a.rating,
        COALESCE(array_agg(c.text) FILTER (WHERE c.text IS NOT NULL), '{}') AS categories
      FROM root_spans r
      LEFT JOIN annotations a ON r.id = a.root_span_id
      LEFT JOIN annotation_categories ac ON a.id = ac.annotation_id
      LEFT JOIN categories c ON ac.category_id = c.id
      ${whereSQL}
      GROUP BY 
        r.id, r.trace_id, r.batch_id, r.input, r.output, 
        r.project_id, r.span_name, r.start_time, 
        r.end_time, r.created_at,
        r.formatted_input, r.formatted_output,
        a.id, a.note, a.rating
      ORDER BY r.created_at DESC, r.id ASC
      LIMIT $${params.length - 1}
      OFFSET $${params.length};
    `;
        const countQuery = `
      SELECT COUNT(*) FROM root_spans r
      ${whereSQL}
    `;
        const [dataResult, countResult] = yield Promise.all([
            postgres_1.pool.query(query, params),
            postgres_1.pool.query(countQuery, params.slice(0, params.length - 2)), // exclude limit/offset
        ]);
        const rootSpans = dataResult.rows.map(row => {
            var _a, _b, _c;
            return ({
                id: row.root_span_id,
                traceId: row.trace_id,
                batchId: row.batch_id,
                input: row.input,
                output: row.output,
                projectId: row.project_id,
                spanName: row.span_name,
                startTime: row.start_time,
                endTime: row.end_time,
                createdAt: row.created_at,
                formattedInput: row.formatted_input,
                formattedOutput: row.formatted_output,
                annotation: row.annotation_id
                    ? {
                        id: row.annotation_id,
                        note: (_a = row.note) !== null && _a !== void 0 ? _a : "", // fallback
                        rating: (_b = row.rating) !== null && _b !== void 0 ? _b : "bad", // fallback to valid Rating
                        categories: (_c = row.categories) !== null && _c !== void 0 ? _c : [], // fallback
                    }
                    : null,
            });
        });
        return {
            rootSpans,
            totalCount: parseInt(countResult.rows[0].count, 10),
        };
    }
    catch (error) {
        console.error("Error in getAllRootSpans:", error);
        throw new Error("Failed to fetch root spans from the database");
    }
});
exports.fetchFormattedRootSpans = fetchFormattedRootSpans;
const fetchUniqueSpanNames = (projectId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = `
      SELECT DISTINCT span_name 
      FROM root_spans 
      WHERE project_id = $1 
        AND span_name IS NOT NULL 
        AND span_name != ''
      ORDER BY span_name ASC
    `;
        const result = yield postgres_1.pool.query(query, [projectId]);
        return result.rows.map(row => row.span_name);
    }
    catch (error) {
        console.error("Error fetching unique span names:", error);
        throw new Error("Failed to fetch unique span names from the database");
    }
});
exports.fetchUniqueSpanNames = fetchUniqueSpanNames;
const fetchRandomSpans = (_a) => __awaiter(void 0, [_a], void 0, function* ({ projectId, }) {
    try {
        const whereClauses = [];
        const params = [];
        // Always filter by project and exclude batched spans
        params.push(projectId);
        whereClauses.push(`r.project_id = $${params.length}`);
        whereClauses.push(`r.batch_id IS NULL`);
        const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
        // Get 50 random spans from the most recent 200 spans
        const query = `
      WITH recent_spans AS (
        SELECT 
          r.id,
          r.trace_id,
          r.batch_id,
          r.input,
          r.output,
          r.project_id,
          r.span_name,
          r.start_time,
          r.end_time,
          r.created_at
        FROM root_spans r
        ${whereSQL}
        ORDER BY r.created_at DESC
        LIMIT 200
      )
      SELECT 
        id,
        trace_id,
        batch_id,
        input,
        output,
        project_id,
        span_name,
        start_time,
        end_time,
        created_at
      FROM recent_spans
      ORDER BY RANDOM()
      LIMIT 50;
    `;
        const countQuery = `
      SELECT COUNT(*) FROM root_spans r
      ${whereSQL}
    `;
        const [dataResult, countResult] = yield Promise.all([
            postgres_1.pool.query(query, params),
            postgres_1.pool.query(countQuery, params),
        ]);
        const rootSpans = dataResult.rows.map(row => ({
            id: row.id,
            traceId: row.trace_id,
            batchId: row.batch_id,
            input: row.input,
            output: row.output,
            projectId: row.project_id,
            spanName: row.span_name,
            startTime: row.start_time,
            endTime: row.end_time,
            createdAt: row.created_at,
            annotation: null, // Random spans don't have annotations
        }));
        return {
            rootSpans,
            totalCount: Math.min(50, parseInt(countResult.rows[0].count, 10)), // Cap at 50 for random
        };
    }
    catch (error) {
        console.error("Error fetching random spans:", error);
        throw new Error("Failed to fetch random spans from the database");
    }
});
exports.fetchRandomSpans = fetchRandomSpans;
