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
const rootSpanService_1 = require("../../src/services/rootSpanService");
const postgres_1 = require("../../src/db/postgres");
// any code from this path, use my fake version instead
vitest_1.vi.mock('../../src/db/postgres', () => ({
    pool: {
        query: vitest_1.vi.fn(),
    }
}));
// for type safety
const mockPool = vitest_1.vi.mocked(postgres_1.pool);
const mockQuery = mockPool.query;
(0, vitest_1.describe)('fetchRootSpans', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)('should fetch root spans with projectId', () => __awaiter(void 0, void 0, void 0, function* () {
        const mockDataRows = [
            {
                root_span_id: 'span-1',
                trace_id: 'trace-1',
                batch_id: null,
                input: 'test input',
                output: 'test output',
                project_id: 'project-1',
                span_name: 'test-span',
                start_time: '2024-01-01T00:00:00Z',
                end_time: '2024-01-01T00:01:00Z',
                created_at: '2024-01-01T00:00:00Z',
                annotation_id: null,
                note: null,
                rating: null,
                categories: []
            },
        ];
        const mockCountRows = [{ count: '1' }];
        mockQuery
            .mockResolvedValueOnce({ rows: mockDataRows })
            .mockResolvedValueOnce({ rows: mockCountRows });
        // Act - Use the proper type structure
        const queryParams = {
            projectId: 'project-1',
            batchId: undefined,
            spanName: undefined,
            pageNumber: '1',
            numberPerPage: '10'
        };
        const result = yield (0, rootSpanService_1.fetchRootSpans)(queryParams);
        // Assert
        (0, vitest_1.expect)(result).toEqual({
            rootSpans: [{
                    id: 'span-1',
                    traceId: 'trace-1',
                    batchId: null,
                    input: 'test input',
                    output: 'test output',
                    projectId: 'project-1',
                    spanName: 'test-span',
                    startTime: '2024-01-01T00:00:00Z',
                    endTime: '2024-01-01T00:01:00Z',
                    createdAt: '2024-01-01T00:00:00Z',
                    annotation: null
                }],
            totalCount: 1
        });
    }));
    (0, vitest_1.it)('should validate parameters', () => __awaiter(void 0, void 0, void 0, function* () {
        // Act - Use the proper type structure
        const queryParams = {
            projectId: undefined,
            batchId: undefined,
            spanName: undefined,
            pageNumber: '1',
            numberPerPage: '10'
        };
        yield (0, vitest_1.expect)((0, rootSpanService_1.fetchRootSpans)(queryParams))
            .rejects
            .toThrow("Either projectId or batchID is required");
    }));
});
(0, vitest_1.describe)('getRootSpanById', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)('should return root span by id successfully', () => __awaiter(void 0, void 0, void 0, function* () {
        const mockRow = {
            root_span_id: 'span-123',
            trace_id: 'trace-456',
            batch_id: 'batch-789',
            input: 'get span input',
            output: 'get span output',
            project_id: 'project-abc',
            span_name: 'get-span-test',
            start_time: '2024-01-15T10:30:00Z',
            end_time: '2024-01-15T10:31:00Z',
            created_at: '2024-01-15T10:30:00Z',
            annotation_id: 'annotation-123',
            note: 'Test annotation note',
            rating: 'good',
            categories: ['performance', 'accuracy']
        };
        mockQuery.mockResolvedValueOnce({ rows: [mockRow] });
        const result = yield (0, rootSpanService_1.getRootSpanById)('span-123');
        (0, vitest_1.expect)(result).toEqual({
            id: 'span-123',
            traceId: 'trace-456',
            batchId: 'batch-789',
            input: 'get span input',
            output: 'get span output',
            projectId: 'project-abc',
            spanName: 'get-span-test',
            startTime: '2024-01-15T10:30:00Z',
            endTime: '2024-01-15T10:31:00Z',
            createdAt: '2024-01-15T10:30:00Z',
            annotation: {
                id: 'annotation-123',
                note: 'Test annotation note',
                rating: 'good',
                categories: ['performance', 'accuracy']
            }
        });
        // Verify correct SQL was called
        (0, vitest_1.expect)(mockQuery).toHaveBeenCalledWith(vitest_1.expect.stringContaining('WHERE r.id = $1'), ['span-123']);
    }));
    (0, vitest_1.it)('should throw RootSpanNotFoundError when span does not exist', () => __awaiter(void 0, void 0, void 0, function* () {
        // Mock empty result (no rows found)
        mockQuery.mockResolvedValue({ rows: [] });
        yield (0, vitest_1.expect)((0, rootSpanService_1.getRootSpanById)('nonexistent-span'))
            .rejects
            .toThrow(rootSpanService_1.RootSpanNotFoundError);
        yield (0, vitest_1.expect)((0, rootSpanService_1.getRootSpanById)('nonexistent-span'))
            .rejects
            .toThrow('Root Span with id nonexistent-span not found');
    }));
    (0, vitest_1.it)('should handle database error in getRootSpanById', () => __awaiter(void 0, void 0, void 0, function* () {
        mockQuery.mockRejectedValueOnce(new Error('Connection timeout'));
        yield (0, vitest_1.expect)((0, rootSpanService_1.getRootSpanById)('span-123'))
            .rejects
            .toThrow('Database error while fetching root span with id span-123');
    }));
});
(0, vitest_1.describe)('rootSpanExists', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)('should return true when span exists', () => __awaiter(void 0, void 0, void 0, function* () {
        mockQuery.mockResolvedValueOnce({ rowCount: 1 });
        const result = yield (0, rootSpanService_1.rootSpanExists)('existing-span');
        (0, vitest_1.expect)(result).toBe(true);
        (0, vitest_1.expect)(mockQuery).toHaveBeenCalledWith(vitest_1.expect.stringMatching(/SELECT 1 FROM root_spans\s+WHERE id = \$1/), ['existing-span']);
    }));
    (0, vitest_1.it)('should return false when span does not exist', () => __awaiter(void 0, void 0, void 0, function* () {
        mockQuery.mockResolvedValueOnce({ rowCount: 0 });
        const result = yield (0, rootSpanService_1.rootSpanExists)('nonexistent-span');
        (0, vitest_1.expect)(result).toBe(false);
    }));
    (0, vitest_1.it)('should return false when rowCount is null', () => __awaiter(void 0, void 0, void 0, function* () {
        mockQuery.mockResolvedValueOnce({ rowCount: null });
        const result = yield (0, rootSpanService_1.rootSpanExists)('some-span');
        (0, vitest_1.expect)(result).toBe(false);
    }));
    (0, vitest_1.it)('should throw error when database query fails', () => __awaiter(void 0, void 0, void 0, function* () {
        mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));
        yield (0, vitest_1.expect)((0, rootSpanService_1.rootSpanExists)('span-123'))
            .rejects
            .toThrow('Failed to check root span existence');
    }));
});
