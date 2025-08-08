import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getAllAnnotations,
  getAnnotationById,
  createNewAnnotation,
  updateAnnotationById,
  deleteAnnotationById,
  AnnotationNotFoundError
} from '../../src/services/annotationService';
import { NewAnnotation } from '../../src/types/types';
import { getPool } from '../../src/db/postgres';

const mockQuery = vi.fn();
// Mock the database pool
vi.mock('../../src/db/postgres', () => ({
  getPool: () => ({
    query: mockQuery,
  })
}));

// Mock UUID generation
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-annotation-id')
}));

describe('AnnotationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllAnnotations', () => {
    it('should return all annotations with categories', async () => {
      const mockRows = [
        {
          annotation_id: 'annotation-1',
          root_span_id: 'span-1',
          note: 'First annotation',
          rating: 'good',
          categories: ['accuracy', 'performance']
        },
        {
          annotation_id: 'annotation-2',
          root_span_id: 'span-2',
          note: 'Second annotation',
          rating: 'bad',
          categories: []
        }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      const result = await getAllAnnotations();

      expect(result).toEqual([
        {
          id: 'annotation-1',
          rootSpanId: 'span-1',
          note: 'First annotation',
          rating: 'good',
          categories: ['accuracy', 'performance']
        },
        {
          id: 'annotation-2',
          rootSpanId: 'span-2',
          note: 'Second annotation',
          rating: 'bad',
          categories: []
        }
      ]);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT')
      );
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(getAllAnnotations())
        .rejects
        .toThrow('Failed to fetch annotations from database');
    });
  });

  describe('getAnnotationById', () => {
    it('should return annotation by id', async () => {
      const mockRow = {
        annotation_id: 'annotation-1',
        root_span_id: 'span-1',
        note: 'Test annotation',
        rating: 'good',
        categories: ['accuracy']
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await getAnnotationById('annotation-1');

      expect(result).toEqual({
        id: 'annotation-1',
        rootSpanId: 'span-1',
        note: 'Test annotation',
        rating: 'good',
        categories: ['accuracy']
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE a.id = $1'),
        ['annotation-1']
      );
    });

    it('should throw AnnotationNotFoundError when annotation does not exist', async () => {
      mockQuery.mockResolvedValue({ rows: [] }); // Use mockResolvedValue for multiple calls

      await expect(getAnnotationById('nonexistent-annotation'))
        .rejects
        .toThrow(AnnotationNotFoundError);

      await expect(getAnnotationById('nonexistent-annotation'))
        .rejects
        .toThrow('Annotation with id nonexistent-annotation not found');
    });
  });

  describe('createNewAnnotation', () => {
    it('should create a new annotation', async () => {
      const newAnnotation: NewAnnotation = {
        rootSpanId: 'span-1',
        note: 'New test annotation',
        rating: 'good'
      };

      const mockReturnRow = {
        id: 'test-annotation-id',
        root_span_id: 'span-1',
        note: 'New test annotation',
        rating: 'good'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockReturnRow] });

      const result = await createNewAnnotation(newAnnotation);

      expect(result).toEqual({
        id: 'test-annotation-id',
        rootSpanId: 'span-1',
        note: 'New test annotation',
        rating: 'good',
        categories: []
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO annotations'),
        ['test-annotation-id', 'span-1', 'New test annotation', 'good']
      );
    });

    it('should handle database errors during creation', async () => {
      const newAnnotation: NewAnnotation = {
        rootSpanId: 'span-1',
        note: 'Test annotation',
        rating: 'good'
      };

      mockQuery.mockRejectedValueOnce(new Error('Foreign key constraint failed'));

      await expect(createNewAnnotation(newAnnotation))
        .rejects
        .toThrow('Database error while creating annotation');
    });
  });

  describe('updateAnnotationById', () => {
    it('should update annotation with provided fields', async () => {
      const updates = {
        note: 'Updated note',
        rating: 'bad' as const
      };

      const mockReturnRow = {
        id: 'annotation-1',
        root_span_id: 'span-1',
        note: 'Updated note',
        rating: 'bad'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockReturnRow] });

      const result = await updateAnnotationById('annotation-1', updates);

      expect(result).toEqual({
        id: 'annotation-1',
        rootSpanId: 'span-1',
        note: 'Updated note',
        rating: 'bad',
        categories: []
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE annotations'),
        ['Updated note', 'bad', 'annotation-1']
      );
    });

    it('should throw error when no fields provided to update', async () => {
      await expect(updateAnnotationById('annotation-1', {}))
        .rejects
        .toThrow('No fields provided to update');

      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should throw AnnotationNotFoundError when annotation does not exist', async () => {
      const updates = { note: 'Updated note' };

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(updateAnnotationById('nonexistent-annotation', updates))
        .rejects
        .toThrow(AnnotationNotFoundError);
    });
  });

  describe('deleteAnnotationById', () => {
    it('should delete annotation and return deleted data', async () => {
      const mockReturnRow = {
        id: 'annotation-1',
        root_span_id: 'span-1',
        note: 'Deleted annotation',
        rating: 'good'
      };

      mockQuery.mockResolvedValueOnce({ 
        rows: [mockReturnRow],
        rowCount: 1 
      });

      const result = await deleteAnnotationById('annotation-1');

      expect(result).toEqual({
        id: 'annotation-1',
        rootSpanId: 'span-1',
        note: 'Deleted annotation',
        rating: 'good',
        categories: []
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM annotations'),
        ['annotation-1']
      );
    });

    it('should throw AnnotationNotFoundError when annotation does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ 
        rows: [],
        rowCount: 0 
      });

      await expect(deleteAnnotationById('nonexistent-annotation'))
        .rejects
        .toThrow(AnnotationNotFoundError);
    });

    it('should handle database errors during deletion', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database constraint violation'));

      await expect(deleteAnnotationById('annotation-1'))
        .rejects
        .toThrow('Database error while deleting annotation with id annotation-1');
    });
  });
});
