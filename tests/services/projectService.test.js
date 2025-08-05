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
const projectService_1 = require("../../src/services/projectService");
const postgres_1 = require("../../src/db/postgres");
// Mock the database pool
vitest_1.vi.mock('../../src/db/postgres', () => ({
    pool: {
        query: vitest_1.vi.fn(),
    }
}));
const mockQuery = vitest_1.vi.mocked(postgres_1.pool.query);
(0, vitest_1.describe)('ProjectService', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('getProjectSummaries', () => {
        (0, vitest_1.it)('should return project summaries with correct data transformation', () => __awaiter(void 0, void 0, void 0, function* () {
            // Mock data for the project query
            const mockProjectRows = [
                {
                    id: 'project-1',
                    name: 'Test Project 1',
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-02T00:00:00Z'
                },
                {
                    id: 'project-2',
                    name: 'Test Project 2',
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T12:00:00Z'
                }
            ];
            // Mock data for the counts query
            const mockCountRows = [
                {
                    id: 'project-1',
                    valid_root_span_count: '15',
                    num_batches: '3'
                },
                {
                    id: 'project-2',
                    valid_root_span_count: '8',
                    num_batches: '1'
                }
            ];
            // Mock the parallel database queries
            mockQuery
                .mockResolvedValueOnce({ rows: mockProjectRows }) // First query - projects
                .mockResolvedValueOnce({ rows: mockCountRows }); // Second query - counts
            const result = yield (0, projectService_1.getProjectSummaries)();
            (0, vitest_1.expect)(result).toEqual([
                {
                    id: 'project-1',
                    name: 'Test Project 1',
                    createdAt: '2024-01-01T00:00:00Z',
                    updatedAt: '2024-01-02T00:00:00Z',
                    validRootSpanCount: 15,
                    numBatches: 3
                },
                {
                    id: 'project-2',
                    name: 'Test Project 2',
                    createdAt: '2024-01-01T00:00:00Z',
                    updatedAt: '2024-01-01T12:00:00Z',
                    validRootSpanCount: 8,
                    numBatches: 1
                }
            ]);
            // Verify both queries were called in parallel
            (0, vitest_1.expect)(mockQuery).toHaveBeenCalledTimes(2);
            // Verify the project query
            (0, vitest_1.expect)(mockQuery).toHaveBeenNthCalledWith(1, vitest_1.expect.stringContaining('SELECT id, name, created_at, updated_at'));
            // Verify the counts query  
            (0, vitest_1.expect)(mockQuery).toHaveBeenNthCalledWith(2, vitest_1.expect.stringContaining('valid_root_span_count'));
        }));
        (0, vitest_1.it)('should handle database errors and throw appropriate error', () => __awaiter(void 0, void 0, void 0, function* () {
            // Mock database error for both potential queries (Promise.all starts both)
            mockQuery.mockRejectedValue(new Error('Database connection failed'));
            yield (0, vitest_1.expect)((0, projectService_1.getProjectSummaries)())
                .rejects
                .toThrow('Failed to load project summaries from the database.');
            // Verify that database queries were attempted (Promise.all may call both)
            (0, vitest_1.expect)(mockQuery).toHaveBeenCalled();
        }));
    });
});
