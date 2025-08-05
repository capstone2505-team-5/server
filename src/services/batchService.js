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
exports.formatBatch = exports.deleteBatchById = exports.updateBatchById = exports.getBatchSummaryById = exports.createNewBatch = exports.getBatchSummariesByProject = void 0;
const postgres_1 = require("../db/postgres");
const uuid_1 = require("uuid");
const errors_1 = require("../errors/errors");
const index_1 = require("../constants/index");
const rootSpanService_1 = require("./rootSpanService");
const openaiClient_1 = require("../lib/openaiClient");
const errors_2 = require("../errors/errors");
const jsonCleanup_1 = require("../utils/jsonCleanup");
const annotationService_1 = require("./annotationService");
const sseService_1 = require("./sseService");
const getBatchSummariesByProject = (projectId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = `
      SELECT 
        b.id,
        b.project_id,
        b.name,
        b.created_at,
        COUNT(DISTINCT rs.id) AS valid_root_span_count,
        COUNT(DISTINCT a.id)::float / NULLIF(COUNT(DISTINCT rs.id), 0) * 100 AS percent_annotated,
        COUNT(DISTINCT CASE WHEN a.rating = 'good' THEN a.id END)::float / NULLIF(COUNT(DISTINCT a.id), 0) * 100 AS percent_good,
        COALESCE(array_agg(DISTINCT c.text) FILTER (WHERE c.text IS NOT NULL), '{}') AS categories
      FROM batches b
      LEFT JOIN root_spans rs ON rs.batch_id = b.id
      LEFT JOIN annotations a ON a.root_span_id = rs.id
      LEFT JOIN annotation_categories ac ON a.id = ac.annotation_id
      LEFT JOIN categories c ON ac.category_id = c.id
      WHERE b.project_id = $1
      GROUP BY b.id, b.project_id, b.name, b.created_at
      ORDER BY b.created_at DESC;
    `;
        const result = yield postgres_1.pool.query(query, [projectId]);
        return result.rows.map((row) => ({
            id: row.id,
            projectId: row.project_id,
            name: row.name,
            createdAt: row.created_at.toISOString(),
            validRootSpanCount: row.valid_root_span_count,
            percentAnnotated: row.percent_annotated !== null ? parseFloat(row.percent_annotated.toFixed(2)) : null,
            percentGood: row.percent_good !== null ? parseFloat(row.percent_good.toFixed(2)) : null,
            categories: row.categories,
        }));
    }
    catch (error) {
        console.error('Error fetching batch summaries:', error);
        throw new Error('Failed to fetch batch summaries');
    }
});
exports.getBatchSummariesByProject = getBatchSummariesByProject;
const createNewBatch = (batch) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = (0, uuid_1.v4)();
        const { name, rootSpanIds, projectId } = batch;
        // Validate batch size limit
        if (rootSpanIds.length > 150) {
            throw new Error(`Batch size cannot exceed 150 root spans. Provided: ${rootSpanIds.length}`);
        }
        // Validate that none of the root spans already belong to a batch
        if (rootSpanIds.length > 0) {
            const checkQuery = `
        SELECT id, batch_id 
        FROM root_spans 
        WHERE id = ANY($1) AND batch_id IS NOT NULL
      `;
            const conflictResult = yield postgres_1.pool.query(checkQuery, [rootSpanIds]);
            if (conflictResult.rows.length > 0) {
                const conflictingSpans = conflictResult.rows.map(row => row.id);
                throw new Error(`Root spans already assigned to batches: ${conflictingSpans.join(', ')}`);
            }
        }
        // insert new batch record
        yield postgres_1.pool.query(`INSERT INTO batches (id, project_id, name) VALUES ($1, $2, $3)`, [id, projectId, name]);
        // If there are rootSpanIds, attach them to this batch
        if (rootSpanIds.length > 0) {
            yield postgres_1.pool.query(`UPDATE root_spans
        SET batch_id = $1
        WHERE id = ANY($2)`, [id, rootSpanIds]);
        }
        console.log(`Attempting to async format batch ${id}`);
        (0, exports.formatBatch)(id);
        return { id, projectId, name, rootSpanIds };
    }
    catch (e) {
        console.error('Failed to create new batch in database.');
        throw e;
    }
});
exports.createNewBatch = createNewBatch;
const getBatchSummaryById = (batchId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = `
      SELECT 
        b.id,
        b.project_id,
        b.name,
        COUNT(DISTINCT rs.id) AS span_count,
        COUNT(DISTINCT a.id)::float / NULLIF(COUNT(DISTINCT rs.id), 0) * 100 AS percent_annotated,
        COUNT(DISTINCT CASE WHEN a.rating = 'good' THEN a.id END)::float / NULLIF(COUNT(DISTINCT a.id), 0) * 100 AS percent_good,
        COALESCE(array_agg(DISTINCT c.text) FILTER (WHERE c.text IS NOT NULL), '{}') AS categories
      FROM batches b
      LEFT JOIN root_spans rs ON rs.batch_id = b.id
      LEFT JOIN annotations a ON a.root_span_id = rs.id
      LEFT JOIN annotation_categories ac ON ac.annotation_id = a.id
      LEFT JOIN categories c ON c.id = ac.category_id
      WHERE b.id = $1
      GROUP BY b.id, b.project_id, b.name
    `;
        const result = yield postgres_1.pool.query(query, [batchId]);
        if (result.rowCount === 0) {
            throw new errors_1.BatchNotFoundError(batchId);
        }
        return result.rows[0];
    }
    catch (e) {
        console.error("failed to get batch in database", e);
        throw (e);
    }
});
exports.getBatchSummaryById = getBatchSummaryById;
/**
 * Update a batch’s name and its set of assigned rootSpanIds
 * Remove batch_id and annotations from removed spans
 */
const updateBatchById = (batchId, batchUpdate) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name: newName, rootSpanIds: newRootSpanIds } = batchUpdate;
        // update batch name
        const result = yield postgres_1.pool.query(`
        UPDATE batches 
        SET name = $1 
        WHERE id = $2 
        RETURNING id, project_id
      `, [newName, batchId]);
        if (result.rowCount === 0) {
            throw new errors_1.BatchNotFoundError(batchId);
        }
        const { project_id } = result.rows[0];
        // detach old spans from batch (if not in updated root spans)
        const updateSpansResult = yield postgres_1.pool.query(`
        UPDATE root_spans
        SET batch_id = NULL
        WHERE batch_id = $1
        AND id <> ALL($2)
        RETURNING id
      `, [batchId, newRootSpanIds]);
        // remove annotations from spans removed from batch
        if ((updateSpansResult.rowCount || 0) > 0) {
            const removedSpansIds = updateSpansResult.rows
                .map(s => s.id);
            yield (0, annotationService_1.removeAnnotationFromSpans)(removedSpansIds);
        }
        // attach new spans
        if (newRootSpanIds.length > 0) {
            yield postgres_1.pool.query(`
          UPDATE root_spans
          SET batch_id = $1
          WHERE id = ANY($2)
          `, [batchId, newRootSpanIds]);
        }
        return {
            id: batchId,
            name: newName,
            projectId: project_id,
            rootSpanIds: newRootSpanIds,
        };
    }
    catch (e) {
        console.error("failed to update batch in database", e);
        throw e;
    }
});
exports.updateBatchById = updateBatchById;
const deleteBatchById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // fetch spans before deletion
        const spansResult = yield postgres_1.pool.query(`SELECT id FROM root_spans WHERE batch_id = $1`, [id]);
        const rootSpanIds = spansResult.rows.map(r => r.id);
        // delete batch and return metadata
        const result = yield postgres_1.pool.query(`
      DELETE FROM batches
      WHERE id = $1
      RETURNING id, name, project_id
    `, [id]);
        if (result.rowCount === 0) {
            throw new errors_1.BatchNotFoundError(id);
        }
        const { id: deletedId, name, project_id } = result.rows[0];
        yield (0, annotationService_1.removeAnnotationFromSpans)(rootSpanIds);
        return {
            id: deletedId,
            name,
            projectId: project_id,
            rootSpanIds,
        };
    }
    catch (e) {
        console.error("failed to delete batch in database", e);
        throw e;
    }
});
exports.deleteBatchById = deleteBatchById;
const formatBatch = (batchId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        (0, sseService_1.sendSSEUpdate)(batchId, {
            status: 'started',
            message: 'Batch formatting started',
            progress: 0,
            timestamp: new Date().toISOString()
        });
        console.log(`Starting to format batch ${batchId}`);
        const spanSets = yield getSpanSetsFromBatch(batchId);
        console.log(`${spanSets.length} span sets extracted from batch`);
        (0, sseService_1.sendSSEUpdate)(batchId, {
            status: 'processing',
            message: `Processing ${spanSets.length} spans with AI`,
            progress: 25
        });
        const formattedSpanSets = yield formatAllSpanSets(spanSets);
        console.log(`${formattedSpanSets.length} span sets formatted`);
        (0, sseService_1.sendSSEUpdate)(batchId, {
            status: 'saving',
            message: 'Saving formatted data to database',
            progress: 75
        });
        const updateDbResult = yield (0, rootSpanService_1.insertFormattedSpanSets)(formattedSpanSets);
        console.log(`${updateDbResult.updated} root spans formatted in DB`);
        yield markBatchFormatted(batchId);
        (0, sseService_1.sendSSEUpdate)(batchId, {
            status: 'completed',
            message: `Successfully formatted ${updateDbResult.updated} spans`,
            progress: 100,
            timestamp: new Date().toISOString()
        });
        setTimeout(() => (0, sseService_1.closeSSEConnection)(batchId), 1000);
    }
    catch (e) {
        console.error("batch formatting error");
        const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
        (0, sseService_1.sendSSEUpdate)(batchId, {
            status: 'failed',
            message: 'Batch formatting failed',
            error: errorMessage,
            timestamp: new Date().toISOString()
        });
        setTimeout(() => (0, sseService_1.closeSSEConnection)(batchId), 1000);
        throw new Error("Error formatting batch");
    }
});
exports.formatBatch = formatBatch;
const getSpanSetsFromBatch = (batchId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rootSpans = yield (0, rootSpanService_1.fetchRootSpans)({
            batchId,
            projectId: undefined,
            spanName: undefined,
            pageNumber: String(1),
            numberPerPage: String(index_1.MAX_SPANS_PER_BATCH),
        });
        return extractSpanSets(rootSpans);
    }
    catch (e) {
        console.error("failed to get span sets sets in database", e);
        throw e;
    }
});
const extractSpanSets = (rootSpanResults) => {
    const annotatedRootSpans = rootSpanResults.rootSpans;
    return annotatedRootSpans.map(aRS => {
        return {
            input: aRS.input,
            output: aRS.output,
            spanId: aRS.id,
        };
    });
};
const formatAllSpanSets = (spanSets) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const CHUNK_SIZE = 5;
        // Handle empty case
        if (spanSets.length === 0)
            return [];
        // Split into chunks of 30
        const chunks = [];
        for (let i = 0; i < spanSets.length; i += CHUNK_SIZE) {
            chunks.push(spanSets.slice(i, i + CHUNK_SIZE));
        }
        console.log(`Processing ${spanSets.length} spans in ${chunks.length} chunks of max ${CHUNK_SIZE}`);
        // Process all chunks in parallel with Promise.all
        const chunkPromises = chunks.map((chunk, index) => {
            console.log(`Starting chunk ${index + 1}/${chunks.length} (${chunk.length} spans)`);
            return formatSpanSetsChunk(chunk);
        });
        const chunkResults = yield Promise.all(chunkPromises);
        // Flatten all results into single array
        const allResults = chunkResults.flat();
        console.log(`Successfully formatted ${allResults.length} spans total`);
        return allResults;
    }
    catch (e) {
        console.error("failed to format all span sets");
        throw e;
    }
});
const formatSpanSetsChunk = (spanSets) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const systemPrompt = `
  You are a data formatter. I will provide you with an array of objects, 
  each containing "input", "output", and "spanId" properties. 
  Your task is to format the input and output into clean, readable 
  Markdown while preserving the spanId.

  INSTRUCTIONS:
  1. Analyze each input/output to determine its content type (email, recipe, JSON, code, plain text, etc.)
  2. Format each as clean, readable Markdown appropriate for its content type
  3. Return valid JSON only - no explanations or markdown code blocks around your response
  
  EXAMPLE INPUT FORMAT:
  [
    {
      "input": "{"user_input":"red wine opolo winery $50 budget","limit":4,"min_similarity":0.3}",
      "output": "{{"Opolo Vineyards","7110 Vineyard Dr, Paso Robles, CA 93446","9","10","Showcases crisp sauvignon blanc and rich petit verdot.","0.6053682095251376"}}",
      "spanId": "0008f44ad2f382fa"
    },
    {
      "input": "Subject: Meeting Tomorrow\\nFrom: john@company.com\\nHi team, let's meet at 2pm to discuss the project.",
      "output": "Meeting confirmed for 2pm tomorrow. Conference room B is booked.",
      "spanId": "abc123def456"
    }
  ]
  
  FORMATTING GUIDELINES:
  - **JSON/Code**: Remove the code and technical syntax and make it into a human readable format
  - **Emails**: Format with proper headers (From:, To:, Subject:, etc.)
  - **Recipes**: Use headers, ingredient lists, numbered steps
  - **Lists**: Use proper Markdown lists (- or 1.)
  - **Structured data**: Use tables or organized sections
  - **Plain text**: Clean up spacing, add line breaks for readability
  - **Mixed content**: Break into logical sections with headers
  
  REQUIRED OUTPUT FORMAT:
  [
    {
      "formattedInput": "markdown formatted version of input",
      "formattedOutput": "markdown formatted version of output", 
      "spanId": "exact spanId from original data"
    }
  ]
  
  IMPORTANT:
  - All formattedInputs should for formatted identically
  - All formattedOutputs should be formatted identically
  - Return ONLY the JSON array, no other text
  - Preserve all original spanId values exactly as provided
  - Make formatting decisions based on content, not assumptions
  - If content appears to be JSON, parse it, but remove all code and technical syntax other than markdown
  - If content is already well-formatted, improve it but don't over-complicate
  - Use appropriate Markdown elements: headers (#), lists, code blocks (\`\`\`), tables, etc.`;
    const userContent = JSON.stringify(spanSets, null, 2);
    let raw;
    try {
        const completion = yield openaiClient_1.openai.chat.completions.create({
            model: 'gpt-4o',
            temperature: 0,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
            ],
        }, { timeout: 30000 });
        raw = (_a = completion.choices[0].message.content) !== null && _a !== void 0 ? _a : '';
    }
    catch (err) {
        console.error('OpenAI request failed:', err);
        throw new errors_2.OpenAIError('OpenAI request failed');
    }
    const clean = (0, jsonCleanup_1.jsonCleanup)(raw);
    try {
        const arr = JSON.parse(clean);
        if (!Array.isArray(arr))
            throw new Error('Not an array');
        return arr;
    }
    catch (e) {
        console.error('Bad JSON from model:', clean);
        throw e;
    }
});
const markBatchFormatted = (batchId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = `
      UPDATE batches
      SET formatted_at = NOW()
      WHERE batches.id = $1
    `;
        const result = yield postgres_1.pool.query(query, [batchId]);
        if (result.rowCount === 0) {
            // No rows were updated - batch probably doesn't exist
            throw new Error(`Batch ${batchId} not found`);
        }
        else if (result.rowCount === 1) {
            // Success - exactly one batch was updated
            console.log(`Batch ${batchId} marked as formatted`);
        }
    }
    catch (e) {
        console.error("Error marking batch as formatted");
        throw e;
    }
});
