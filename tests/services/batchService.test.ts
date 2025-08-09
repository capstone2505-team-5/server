import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getBatchSummariesByProject,
  createNewBatch,
  getBatchSummaryById,
  updateBatchById,
  deleteBatchById
} from '../../src/services/batchService';
import { BatchNotFoundError } from '../../src/errors/errors';
import type {
  CreateBatchBodyInput,
  UpdateBatchBodyInput,
} from '../../src/schemas/batchSchemas';

const mockQuery = vi.fn();
// Mock the database pool
vi.mock('../../src/db/postgres', () => ({
  getPool: () => ({
    query: mockQuery,
  })
}));

// Mock external dependencies
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-batch-id')
}));

vi.mock('../../src/services/annotationService', () => ({
  removeAnnotationFromSpans: vi.fn().mockResolvedValue(undefined)
}));

// Mock SSE service
vi.mock('../../src/services/sseService', () => ({
  sendSSEUpdate: vi.fn(),
  closeSSEConnection: vi.fn()
}));

// Mock OpenAI and related services to prevent formatBatch from actually running
vi.mock('../../src/lib/openaiClient', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: '[]' } }]
        })
      }
    }
  }
}));

vi.mock('../../src/services/rootSpanService', () => ({
  fetchRootSpans: vi.fn().mockResolvedValue({ rootSpans: [], totalCount: 0 }),
  insertFormattedSpanSets: vi.fn().mockResolvedValue({ updated: 0 })
}));

// Mock additional utilities
vi.mock('../../src/utils/jsonCleanup', () => ({
  jsonCleanup: vi.fn().mockReturnValue('[]')
}));

// Mock the Lambda client
const mockLambdaSend = vi.fn();
vi.mock('@aws-sdk/client-lambda', () => {
  return {
    LambdaClient: vi.fn(() => ({
      send: mockLambdaSend
    })),
    InvokeCommand: vi.fn(),
  };
});

describe('BatchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBatchSummariesByProject', () => {
    it('should return batch summaries for a project', async () => {
      const mockBatchRows = [
        {
          id: 'batch-1',
          project_id: 'project-1',
          name: 'Test Batch 1',
          created_at: new Date('2024-01-01T00:00:00Z'),
          formatted_at: null,
          valid_root_span_count: 5,
          percent_annotated: 80.0,
          percent_good: 60.0
        },
        {
          id: 'batch-2',
          project_id: 'project-1',
          name: 'Test Batch 2',
          created_at: new Date('2024-01-02T00:00:00Z'),
          formatted_at: null,
          valid_root_span_count: 3,
          percent_annotated: null,
          percent_good: null
        }
      ];

      const mockCategoryRows = [
        { batch_id: 'batch-1', category_text: 'accuracy', category_count: 10 },
        { batch_id: 'batch-1', category_text: 'performance', category_count: 5 },
      ];

      // Mock the two consecutive queries
      mockQuery
        .mockResolvedValueOnce({ rows: mockBatchRows })
        .mockResolvedValueOnce({ rows: mockCategoryRows });

      const result = await getBatchSummariesByProject('project-1');

      expect(result).toEqual([
        {
          id: 'batch-1',
          projectId: 'project-1',
          name: 'Test Batch 1',
          createdAt: '2024-01-01T00:00:00.000Z',
          validRootSpanCount: 5,
          percentAnnotated: 80.0,
          percentGood: 60.0,
          categories: { accuracy: 10, performance: 5 },
          formattedAt: null,
        },
        {
          id: 'batch-2',
          projectId: 'project-1',
          name: 'Test Batch 2',
          createdAt: '2024-01-02T00:00:00.000Z',
          validRootSpanCount: 3,
          percentAnnotated: null,
          percentGood: null,
          categories: {},
          formattedAt: null,
        }
      ]);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenNthCalledWith(1,
        expect.stringContaining('FROM batches b'),
        ['project-1']
      );
      expect(mockQuery).toHaveBeenNthCalledWith(2,
        expect.stringContaining('FROM root_spans rs'),
        ['project-1']
      );
    });
  });

  describe('createNewBatch', () => {
    it('should create a new batch and invoke the formatting lambda', async () => {
      const newBatch: CreateBatchBodyInput = {
        name: 'New Test Batch',
        projectId: 'project-1',
        rootSpanIds: ['span-1', 'span-2']
      };

      // Mock the conflict check, batch insertion, and root span update
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No conflicts
      mockQuery.mockResolvedValueOnce({ rowCount: 1 }); // Insert batch
      mockQuery.mockResolvedValueOnce({ rowCount: 2 }); // Update spans

      const result = await createNewBatch(newBatch);

      expect(result).toEqual({
        id: 'test-batch-id',
        projectId: 'project-1',
        name: 'New Test Batch',
        rootSpanIds: ['span-1', 'span-2']
      });

      // Verify DB calls
      expect(mockQuery).toHaveBeenCalledTimes(3);
      expect(mockQuery).toHaveBeenNthCalledWith(1, expect.stringContaining('SELECT id, batch_id'), [['span-1', 'span-2']]);
      expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO batches'), ['test-batch-id', 'project-1', 'New Test Batch']);
      expect(mockQuery).toHaveBeenNthCalledWith(3, expect.stringContaining('UPDATE root_spans'), ['test-batch-id', ['span-1', 'span-2']]);
      
      // Verify Lambda invocation
      expect(mockLambdaSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('getBatchSummaryById', () => {
    it('should return batch summary by id', async () => {
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

      const result = await getBatchSummaryById('batch-1');

      expect(result).toEqual(mockBatchRow);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE b.id = $1'),
        ['batch-1']
      );
    });

    it('should throw BatchNotFoundError when batch does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ 
        rows: [],
        rowCount: 0 
      });

      await expect(getBatchSummaryById('nonexistent-batch'))
        .rejects
        .toThrow(BatchNotFoundError);
    });
  });

  describe('updateBatchById', () => {
    it('should update batch successfully', async () => {
      const batchUpdate: UpdateBatchBodyInput = {
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

      const result = await updateBatchById('batch-1', batchUpdate);

      expect(result).toEqual({
        id: 'batch-1',
        name: 'Updated Batch Name',
        projectId: 'project-1',
        rootSpanIds: ['span-1', 'span-3', 'span-4']
      });

      expect(mockQuery).toHaveBeenCalledTimes(3);
      
      // Check batch name update with more flexible matching
      expect(mockQuery).toHaveBeenNthCalledWith(1,
        expect.stringContaining('UPDATE batches'),
        ['Updated Batch Name', 'batch-1']
      );
    });
  });

  describe('deleteBatchById', () => {
    it('should delete batch and return details', async () => {
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

      const result = await deleteBatchById('batch-1');

      expect(result).toEqual({
        id: 'batch-1',
        name: 'Deleted Batch',
        projectId: 'project-1',
        rootSpanIds: ['span-1', 'span-2']
      });

      expect(mockQuery).toHaveBeenCalledTimes(2);
      
      // Check spans fetching
      expect(mockQuery).toHaveBeenNthCalledWith(1,
        expect.stringContaining('SELECT id FROM root_spans'),
        ['batch-1']
      );

      // Check batch deletion with more flexible matching
      expect(mockQuery).toHaveBeenNthCalledWith(2,
        expect.stringContaining('DELETE FROM batches'),
        ['batch-1']
      );
    });

    it('should throw BatchNotFoundError when batch does not exist', async () => {
      // Mock fetching spans (empty result)
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      // Mock batch deletion (no rows affected)
      mockQuery.mockResolvedValueOnce({ 
        rows: [],
        rowCount: 0 
      });

      await expect(deleteBatchById('nonexistent-batch'))
        .rejects
        .toThrow(BatchNotFoundError);
    });
  });
});
