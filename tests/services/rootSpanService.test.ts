import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  fetchRootSpans, 
  getRootSpanById,
  rootSpanExists,
  RootSpanNotFoundError 
} from '../../src/services/rootSpanService';
import { RawRootSpanRow, RootSpanQueryParams } from '../../src/types/types'; // Import the type
import { getPool } from '../../src/db/postgres';

const mockQuery = vi.fn();
// any code from this path, use my fake version instead
vi.mock('../../src/db/postgres', () => ({
    getPool: () => ({
      query: mockQuery,
    })
}));

describe('fetchRootSpans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch root spans with projectId', async () => {

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
    const queryParams: RootSpanQueryParams = {
      projectId: 'project-1',
      batchId: undefined,
      spanName: undefined,
      pageNumber: '1',
      numberPerPage: '10'
    };

    const result = await fetchRootSpans(queryParams);

    // Assert
    expect(result).toEqual({
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
  });

  it('should validate parameters', async () => {

    // Act - Use the proper type structure
    const queryParams: RootSpanQueryParams = {
      projectId: undefined,
      batchId: undefined,
      spanName: undefined,
      pageNumber: '1',
      numberPerPage: '10'
    };

    await expect(fetchRootSpans(queryParams))
        .rejects
        .toThrow("Either projectId or batchID is required");
  });
});

describe('getRootSpanById', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });
  
    it('should return root span by id successfully', async () => {
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
  
      const result = await getRootSpanById('span-123');
  
      expect(result).toEqual({
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
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE r.id = $1'),
        ['span-123']
      );
    });
  
    it('should throw RootSpanNotFoundError when span does not exist', async () => {
      // Mock empty result (no rows found)
      mockQuery.mockResolvedValue({ rows: [] });
  
      await expect(getRootSpanById('nonexistent-span'))
        .rejects
        .toThrow(RootSpanNotFoundError);
  
      await expect(getRootSpanById('nonexistent-span'))
        .rejects
        .toThrow('Root Span with id nonexistent-span not found');
    });
  
    it('should handle database error in getRootSpanById', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection timeout'));
  
      await expect(getRootSpanById('span-123'))
        .rejects
        .toThrow('Database error while fetching root span with id span-123');
    });
  });
  
  describe('rootSpanExists', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });
  
    it('should return true when span exists', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });
        
      const result = await rootSpanExists('existing-span');
        
      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT 1 FROM root_spans\s+WHERE id = \$1/),
        ['existing-span']
      );
    });
  
    it('should return false when span does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });
  
      const result = await rootSpanExists('nonexistent-span');
  
      expect(result).toBe(false);
    });
  
    it('should return false when rowCount is null', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: null });
  
      const result = await rootSpanExists('some-span');
  
      expect(result).toBe(false);
    });
  
    it('should throw error when database query fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));
  
      await expect(rootSpanExists('span-123'))
        .rejects
        .toThrow('Failed to check root span existence');
    });
  });
