import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addCategories } from '../../src/services/categoryService';
import { pool } from '../../src/db/postgres';

// Mock the database pool
vi.mock('../../src/db/postgres', () => ({
  pool: {
    query: vi.fn(),
  }
}));

// Mock UUID generation
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-category-id')
}));

const mockQuery = vi.mocked(pool.query) as any;

describe('CategoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addCategories', () => {
    it('should successfully create multiple categories and return them', async () => {
      const categories = ['accuracy', 'performance', 'reliability'];
      const mockRows = [
        { id: 'test-category-id', text: 'accuracy' },
        { id: 'test-category-id', text: 'performance' },
        { id: 'test-category-id', text: 'reliability' }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      const result = await addCategories(categories);

      expect(result).toEqual(mockRows);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO categories (id, text)'),
        ['test-category-id', 'accuracy', 'test-category-id', 'performance', 'test-category-id', 'reliability']
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('VALUES ($1, $2), ($3, $4), ($5, $6)'),
        expect.any(Array)
      );
    });

    it('should handle database errors and re-throw them', async () => {
      const categories = ['test-category'];
      const dbError = new Error('Database connection failed');

      mockQuery.mockRejectedValueOnce(dbError);

      await expect(addCategories(categories))
        .rejects
        .toThrow('Database connection failed');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO categories'),
        ['test-category-id', 'test-category']
      );
    });

    it('should handle empty array input', async () => {
      const categories: string[] = [];
      
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await addCategories(categories);

      expect(result).toEqual([]);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO categories (id, text)'),
        []
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('VALUES '),
        []
      );
    });
  });
});
