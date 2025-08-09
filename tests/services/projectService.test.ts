import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProjectSummaries } from '../../src/services/projectService';
import { getPool } from '../../src/db/postgres';

const mockQuery = vi.fn();
// Mock the database pool
vi.mock('../../src/db/postgres', () => ({
  getPool: () => ({
    query: mockQuery,
  })
}));

describe('ProjectService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProjectSummaries', () => {
    it('should return project summaries with correct data transformation', async () => {
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
        .mockResolvedValueOnce({ rows: mockCountRows });   // Second query - counts

      const result = await getProjectSummaries();

      expect(result).toEqual([
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
      expect(mockQuery).toHaveBeenCalledTimes(2);
      
      // Verify the project query
      expect(mockQuery).toHaveBeenNthCalledWith(1,
        expect.stringContaining('SELECT id, name, created_at, updated_at')
      );

      // Verify the counts query  
      expect(mockQuery).toHaveBeenNthCalledWith(2,
        expect.stringContaining('valid_root_span_count')
      );
    });

    it('should handle database errors and throw appropriate error', async () => {
      // Mock database error for both potential queries (Promise.all starts both)
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(getProjectSummaries())
        .rejects
        .toThrow('Failed to load project summaries from the database.');

      // Verify that database queries were attempted (Promise.all may call both)
      expect(mockQuery).toHaveBeenCalled();
    });
  });
});
