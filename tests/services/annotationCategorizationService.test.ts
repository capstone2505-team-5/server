import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  categorizeBatch,
  addCategoriesToAnnotations,
  createCategories,
  getCategorizedRootSpans,
  pullNotes,
  pullNotesWithRootSpanId
} from '../../src/services/annotationCategorizationService';
import { pool } from '../../src/db/postgres';
import { openai } from '../../src/lib/openaiClient';
import { getAnnotationsByBatch, clearCategoriesFromAnnotations } from '../../src/services/annotationService';
import { addCategories } from '../../src/services/categoryService';
import { OpenAIError } from '../../src/errors/errors';
import { jsonCleanup } from '../../src/utils/jsonCleanup';
import type { Annotation, Category, CategorizedRootSpan } from '../../src/types/types';

// Mock all external dependencies
vi.mock('../../src/db/postgres', () => ({
  pool: {
    query: vi.fn(),
  }
}));

vi.mock('../../src/lib/openaiClient', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      }
    }
  }
}));

vi.mock('../../src/services/annotationService', () => ({
  getAnnotationsByBatch: vi.fn(),
  clearCategoriesFromAnnotations: vi.fn(),
}));

vi.mock('../../src/services/categoryService', () => ({
  addCategories: vi.fn(),
}));

vi.mock('../../src/utils/jsonCleanup', () => ({
  jsonCleanup: vi.fn((input: string) => input),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid')
}));

const mockQuery = vi.mocked(pool.query);
const mockOpenAI = vi.mocked(openai.chat.completions.create);
const mockGetAnnotationsByBatch = vi.mocked(getAnnotationsByBatch);
const mockClearCategoriesFromAnnotations = vi.mocked(clearCategoriesFromAnnotations);
const mockAddCategories = vi.mocked(addCategories);
const mockJsonCleanup = vi.mocked(jsonCleanup);

describe('AnnotationCategorizationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('categorizeBatch', () => {
    it('should categorize bad annotations in a batch and return category counts', async () => {
      const batchId = 'test-batch-id';
      const mockAnnotations: Annotation[] = [
        {
          id: 'ann-1',
          rootSpanId: 'span-1',
          note: 'Poor spelling',
          rating: 'bad',
          categories: []
        },
        {
          id: 'ann-2',
          rootSpanId: 'span-2',
          note: 'Good response',
          rating: 'good',
          categories: []
        },
        {
          id: 'ann-3',
          rootSpanId: 'span-3',
          note: 'Slow response',
          rating: 'bad',
          categories: []
        }
      ];

      const mockCategories = ['spelling', 'speed'];
      const mockCategoriesWithIds: Category[] = [
        { id: 'cat-1', text: 'spelling' },
        { id: 'cat-2', text: 'speed' }
      ];
      const mockCategorizedRootSpans: CategorizedRootSpan[] = [
        { rootSpanId: 'span-1', categories: ['spelling'] },
        { rootSpanId: 'span-3', categories: ['speed', 'spelling'] }
      ];

      mockGetAnnotationsByBatch.mockResolvedValue(mockAnnotations);
      mockClearCategoriesFromAnnotations.mockResolvedValue(2);
      mockOpenAI.mockResolvedValueOnce({
        choices: [{ message: { content: '["spelling", "speed"]' } }]
      } as any);
      mockOpenAI.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockCategorizedRootSpans) } }]
      } as any);
      mockAddCategories.mockResolvedValue(mockCategoriesWithIds);
      mockQuery.mockResolvedValue({ rows: [] } as any);

      const result = await categorizeBatch(batchId);

      expect(result).toEqual({
        spelling: 2,
        speed: 1
      });
      expect(mockGetAnnotationsByBatch).toHaveBeenCalledWith(batchId);
      expect(mockClearCategoriesFromAnnotations).toHaveBeenCalledWith(['ann-1', 'ann-3']);
    });

    it('should return empty object when no bad annotations exist', async () => {
      const batchId = 'test-batch-id';
      const mockAnnotations: Annotation[] = [
        {
          id: 'ann-1',
          rootSpanId: 'span-1',
          note: 'Good response',
          rating: 'good',
          categories: []
        }
      ];

      mockGetAnnotationsByBatch.mockResolvedValue(mockAnnotations);

      const result = await categorizeBatch(batchId);

      expect(result).toEqual({});
      expect(mockClearCategoriesFromAnnotations).not.toHaveBeenCalled();
    });
  });

  describe('addCategoriesToAnnotations', () => {
    it('should add categories to annotations in the database', async () => {
      const categories: Category[] = [
        { id: 'cat-1', text: 'spelling' },
        { id: 'cat-2', text: 'speed' }
      ];
      const annotations: Annotation[] = [
        {
          id: 'ann-1',
          rootSpanId: 'span-1',
          note: 'Poor spelling',
          rating: 'bad',
          categories: []
        }
      ];
      const categorizedRootSpans: CategorizedRootSpan[] = [
        { rootSpanId: 'span-1', categories: ['spelling', 'speed'] }
      ];

      const mockRows = [
        { id: 'test-uuid', annotation_id: 'ann-1', category_id: 'cat-1' },
        { id: 'test-uuid', annotation_id: 'ann-1', category_id: 'cat-2' }
      ];

      mockQuery.mockResolvedValue({ rows: mockRows } as any);

      const result = await addCategoriesToAnnotations(categories, annotations, categorizedRootSpans);

      expect(result).toEqual(mockRows);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO annotation_categories'),
        ['test-uuid', 'ann-1', 'cat-1', 'test-uuid', 'ann-1', 'cat-2']
      );
    });
  });

  describe('createCategories', () => {
    it('should create categories using OpenAI and return them', async () => {
      const notes = ['Poor spelling', 'Slow response', 'Bad grammar'];
      const mockResponse = '["spelling", "speed", "grammar"]';

      mockOpenAI.mockResolvedValue({
        choices: [{ message: { content: mockResponse } }]
      } as any);

      const result = await createCategories(notes);

      expect(result).toEqual(['spelling', 'speed', 'grammar']);
      expect(mockOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          temperature: 0,
          messages: [
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ 
              role: 'user', 
              content: notes.join('\n') 
            })
          ]
        }),
        { timeout: 15_000 }
      );
    });

    it('should throw OpenAIError when API call fails', async () => {
      const notes = ['Poor spelling'];
      
      mockOpenAI.mockRejectedValue(new Error('API Error'));

      await expect(createCategories(notes))
        .rejects
        .toThrow(OpenAIError);
    });

    it('should throw error when response is not an array', async () => {
      const notes = ['Poor spelling'];
      
      mockOpenAI.mockResolvedValue({
        choices: [{ message: { content: '{"not": "array"}' } }]
      } as any);

      await expect(createCategories(notes))
        .rejects
        .toThrow('Wrong Datatype from ChatGPT');
    });

    it('should throw error when no categories are provided', async () => {
      const notes = ['Poor spelling'];
      
      mockOpenAI.mockResolvedValue({
        choices: [{ message: { content: '[]' } }]
      } as any);

      await expect(createCategories(notes))
        .rejects
        .toThrow('No categories provided from LLM');
    });
  });

  describe('getCategorizedRootSpans', () => {
    it('should categorize root spans using OpenAI', async () => {
      const categories = ['spelling', 'speed'];
      const notesWithRootSpanId = [
        'Poor spelling\nrootSpanID: span-1',
        'Slow response\nrootSpanID: span-2'
      ];
      const expectedResult: CategorizedRootSpan[] = [
        { rootSpanId: 'span-1', categories: ['spelling'] },
        { rootSpanId: 'span-2', categories: ['speed'] }
      ];

      mockOpenAI.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(expectedResult) } }]
      } as any);

      const result = await getCategorizedRootSpans(categories, notesWithRootSpanId);

      expect(result).toEqual(expectedResult);
      expect(mockOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          temperature: 0,
          messages: [
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ 
              role: 'user',
              content: expect.stringContaining('Categories:\nspelling\nspeed\n\nNotes:\nPoor spelling\nrootSpanID: span-1\nSlow response\nrootSpanID: span-2')
            })
          ]
        }),
        { timeout: 15_000 }
      );
    });

    it('should throw OpenAIError when API call fails', async () => {
      const categories = ['spelling'];
      const notesWithRootSpanId = ['Poor spelling\nrootSpanID: span-1'];
      
      mockOpenAI.mockRejectedValue(new Error('API Error'));

      await expect(getCategorizedRootSpans(categories, notesWithRootSpanId))
        .rejects
        .toThrow(OpenAIError);
    });
  });

  describe('pullNotes', () => {
    it('should extract notes from annotations', () => {
      const annotations: Annotation[] = [
        {
          id: 'ann-1',
          rootSpanId: 'span-1',
          note: 'First note',
          rating: 'bad',
          categories: []
        },
        {
          id: 'ann-2',
          rootSpanId: 'span-2',
          note: 'Second note',
          rating: 'good',
          categories: []
        }
      ];

      const result = pullNotes(annotations);

      expect(result).toEqual(['First note', 'Second note']);
    });
  });

  describe('pullNotesWithRootSpanId', () => {
    it('should extract notes with root span IDs from annotations', () => {
      const annotations: Annotation[] = [
        {
          id: 'ann-1',
          rootSpanId: 'span-1',
          note: 'First note',
          rating: 'bad',
          categories: []
        },
        {
          id: 'ann-2',
          rootSpanId: 'span-2',
          note: 'Second note',
          rating: 'good',
          categories: []
        }
      ];

      const result = pullNotesWithRootSpanId(annotations);

      expect(result).toEqual([
        'First note\nrootSpanID: span-1',
        'Second note\nrootSpanID: span-2'
      ]);
    });
  });
});
