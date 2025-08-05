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
const vitest_1 = require("vitest");
const batchService_1 = require("../../src/services/batchService");
const errors_1 = require("../../src/errors/errors");
const postgres_1 = require("../../src/db/postgres");
// Mock the database pool
vitest_1.vi.mock('../../src/db/postgres', () => ({
    pool: {
        query: vitest_1.vi.fn(),
    }
}));
// Mock external dependencies
vitest_1.vi.mock('uuid', () => ({
    v4: vitest_1.vi.fn(() => 'test-batch-id')
}));
vitest_1.vi.mock('../../src/services/annotationService', () => ({
    removeAnnotationFromSpans: vitest_1.vi.fn().mockResolvedValue(undefined)
}));
// Mock SSE service
vitest_1.vi.mock('../../src/services/sseService', () => ({
    sendSSEUpdate: vitest_1.vi.fn(),
    closeSSEConnection: vitest_1.vi.fn()
}));
// Mock OpenAI and related services to prevent formatBatch from actually running
vitest_1.vi.mock('../../src/lib/openaiClient', () => ({
    openai: {
        chat: {
            completions: {
                create: vitest_1.vi.fn().mockResolvedValue({
                    choices: [{ message: { content: '[]' } }]
                })
            }
        }
    }
}));
vitest_1.vi.mock('../../src/services/rootSpanService', () => ({
    fetchRootSpans: vitest_1.vi.fn().mockResolvedValue({ rootSpans: [], totalCount: 0 }),
    insertFormattedSpanSets: vitest_1.vi.fn().mockResolvedValue({ updated: 0 })
}));
// Mock additional utilities
vitest_1.vi.mock('../../src/utils/jsonCleanup', () => ({
    jsonCleanup: vitest_1.vi.fn().mockReturnValue('[]')
}));
const mockQuery = vitest_1.vi.mocked(postgres_1.pool.query);
(0, vitest_1.describe)('BatchService', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('getBatchSummariesByProject', () => {
        (0, vitest_1.it)('should return batch summaries for a project', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockBatchRows = [
                {
                    id: 'batch-1',
                    project_id: 'project-1',
                    name: 'Test Batch 1',
                    created_at: new Date('2024-01-01T00:00:00Z'),
                    valid_root_span_count: 5,
                    percent_annotated: 80.0,
                    percent_good: 60.0,
                    categories: ['accuracy', 'performance']
                },
                {
                    id: 'batch-2',
                    project_id: 'project-1',
                    name: 'Test Batch 2',
                    created_at: new Date('2024-01-02T00:00:00Z'),
                    valid_root_span_count: 3,
                    percent_annotated: null,
                    percent_good: null,
                    categories: []
                }
            ];
            mockQuery.mockResolvedValueOnce({ rows: mockBatchRows });
            const result = yield (0, batchService_1.getBatchSummariesByProject)('project-1');
            (0, vitest_1.expect)(result).toEqual([
                {
                    id: 'batch-1',
                    projectId: 'project-1',
                    name: 'Test Batch 1',
                    createdAt: '2024-01-01T00:00:00.000Z',
                    validRootSpanCount: 5,
                    percentAnnotated: 80.0,
                    percentGood: 60.0,
                    categories: ['accuracy', 'performance']
                },
                {
                    id: 'batch-2',
                    projectId: 'project-1',
                    name: 'Test Batch 2',
                    createdAt: '2024-01-02T00:00:00.000Z',
                    validRootSpanCount: 3,
                    percentAnnotated: null,
                    percentGood: null,
                    categories: []
                }
            ]);
            (0, vitest_1.expect)(mockQuery).toHaveBeenCalledWith(vitest_1.expect.stringContaining('FROM batches b'), ['project-1']);
        }));
    });
    (0, vitest_1.describe)('createNewBatch', () => {
        (0, vitest_1.it)('should create a new batch successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            const newBatch = {
                name: 'New Test Batch',
                projectId: 'project-1',
                rootSpanIds: ['span-1', 'span-2']
            };
            // Mock the conflict check query (no conflicts)
            mockQuery.mockResolvedValueOnce({ rows: [] });
            // Mock the batch insertion
            mockQuery.mockResolvedValueOnce({ rowCount: 1 });
            // Mock the root spans update
            mockQuery.mockResolvedValueOnce({ rowCount: 2 });
            // Mock the markBatchFormatted query (called by formatBatch)
            mockQuery.mockResolvedValue({ rowCount: 1 });
            const result = yield (0, batchService_1.createNewBatch)(newBatch);
            (0, vitest_1.expect)(result).toEqual({
                id: 'test-batch-id',
                projectId: 'project-1',
                name: 'New Test Batch',
                rootSpanIds: ['span-1', 'span-2']
            });
            // Just verify that database calls were made (don't check exact count due to formatBatch complexity)
            (0, vitest_1.expect)(mockQuery).toHaveBeenCalled();
            // Check that conflict validation was performed (first call should be the conflict check)
            (0, vitest_1.expect)(mockQuery).toHaveBeenNthCalledWith(1, vitest_1.expect.stringContaining('SELECT id, batch_id'), [['span-1', 'span-2']]);
        }));
    });
    (0, vitest_1.describe)('getBatchSummaryById', () => {
        (0, vitest_1.it)('should return batch summary by id', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockBatchRow = {
                id: 'batch-1',
                project_id: 'project-1',
                name: 'Test Batch',
                span_count: 5,
                percent_annotated: 75.5,
                percent_good: 50.0,
                categories: ['accuracy', 'speed']
            };
            mockQuery.mockResolvedValueOnce({
                rows: [mockBatchRow],
                rowCount: 1
            });
            const result = yield (0, batchService_1.getBatchSummaryById)('batch-1');
            (0, vitest_1.expect)(result).toEqual(mockBatchRow);
            (0, vitest_1.expect)(mockQuery).toHaveBeenCalledWith(vitest_1.expect.stringContaining('WHERE b.id = $1'), ['batch-1']);
        }));
        (0, vitest_1.it)('should throw BatchNotFoundError when batch does not exist', () => __awaiter(void 0, void 0, void 0, function* () {
            mockQuery.mockResolvedValueOnce({
                rows: [],
                rowCount: 0
            });
            yield (0, vitest_1.expect)((0, batchService_1.getBatchSummaryById)('nonexistent-batch'))
                .rejects
                .toThrow(errors_1.BatchNotFoundError);
        }));
    });
    (0, vitest_1.describe)('updateBatchById', () => {
        (0, vitest_1.it)('should update batch successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            const batchUpdate = {
                name: 'Updated Batch Name',
                rootSpanIds: ['span-1', 'span-3', 'span-4']
            };
            // Mock batch name update
            mockQuery.mockResolvedValueOnce({
                rows: [{ id: 'batch-1', project_id: 'project-1' }],
                rowCount: 1
            });
            // Mock spans detachment (returning removed spans)
            mockQuery.mockResolvedValueOnce({
                rows: [{ id: 'span-2' }], // span-2 was removed
                rowCount: 1
            });
            // Mock new spans attachment
            mockQuery.mockResolvedValueOnce({ rowCount: 3 });
            const result = yield (0, batchService_1.updateBatchById)('batch-1', batchUpdate);
            (0, vitest_1.expect)(result).toEqual({
                id: 'batch-1',
                name: 'Updated Batch Name',
                projectId: 'project-1',
                rootSpanIds: ['span-1', 'span-3', 'span-4']
            });
            (0, vitest_1.expect)(mockQuery).toHaveBeenCalledTimes(3);
            // Check batch name update with more flexible matching
            (0, vitest_1.expect)(mockQuery).toHaveBeenNthCalledWith(1, vitest_1.expect.stringContaining('UPDATE batches'), ['Updated Batch Name', 'batch-1']);
        }));
    });
    (0, vitest_1.describe)('deleteBatchById', () => {
        (0, vitest_1.it)('should delete batch and return details', () => __awaiter(void 0, void 0, void 0, function* () {
            // Mock fetching spans before deletion
            mockQuery.mockResolvedValueOnce({
                rows: [{ id: 'span-1' }, { id: 'span-2' }]
            });
            // Mock batch deletion
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: 'batch-1',
                        name: 'Deleted Batch',
                        project_id: 'project-1'
                    }],
                rowCount: 1
            });
            const result = yield (0, batchService_1.deleteBatchById)('batch-1');
            (0, vitest_1.expect)(result).toEqual({
                id: 'batch-1',
                name: 'Deleted Batch',
                projectId: 'project-1',
                rootSpanIds: ['span-1', 'span-2']
            });
            (0, vitest_1.expect)(mockQuery).toHaveBeenCalledTimes(2);
            // Check spans fetching
            (0, vitest_1.expect)(mockQuery).toHaveBeenNthCalledWith(1, vitest_1.expect.stringContaining('SELECT id FROM root_spans'), ['batch-1']);
            // Check batch deletion with more flexible matching
            (0, vitest_1.expect)(mockQuery).toHaveBeenNthCalledWith(2, vitest_1.expect.stringContaining('DELETE FROM batches'), ['batch-1']);
        }));
        (0, vitest_1.it)('should throw BatchNotFoundError when batch does not exist', () => __awaiter(void 0, void 0, void 0, function* () {
            // Mock fetching spans (empty result)
            mockQuery.mockResolvedValueOnce({ rows: [] });
            // Mock batch deletion (no rows affected)
            mockQuery.mockResolvedValueOnce({
                rows: [],
                rowCount: 0
            });
            yield (0, vitest_1.expect)((0, batchService_1.deleteBatchById)('nonexistent-batch'))
                .rejects
                .toThrow(errors_1.BatchNotFoundError);
        }));
    });
});
