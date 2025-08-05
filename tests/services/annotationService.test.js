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
const annotationService_1 = require("../../src/services/annotationService");
const postgres_1 = require("../../src/db/postgres");
// Mock the database pool
vitest_1.vi.mock('../../src/db/postgres', () => ({
    pool: {
        query: vitest_1.vi.fn(),
    }
}));
// Mock UUID generation
vitest_1.vi.mock('uuid', () => ({
    v4: vitest_1.vi.fn(() => 'test-annotation-id')
}));
const mockQuery = vitest_1.vi.mocked(postgres_1.pool.query);
(0, vitest_1.describe)('AnnotationService', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('getAllAnnotations', () => {
        (0, vitest_1.it)('should return all annotations with categories', () => __awaiter(void 0, void 0, void 0, function* () {
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
            const result = yield (0, annotationService_1.getAllAnnotations)();
            (0, vitest_1.expect)(result).toEqual([
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
            (0, vitest_1.expect)(mockQuery).toHaveBeenCalledWith(vitest_1.expect.stringContaining('SELECT'));
        }));
        (0, vitest_1.it)('should handle database errors', () => __awaiter(void 0, void 0, void 0, function* () {
            mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));
            yield (0, vitest_1.expect)((0, annotationService_1.getAllAnnotations)())
                .rejects
                .toThrow('Failed to fetch annotations from database');
        }));
    });
    (0, vitest_1.describe)('getAnnotationById', () => {
        (0, vitest_1.it)('should return annotation by id', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockRow = {
                annotation_id: 'annotation-1',
                root_span_id: 'span-1',
                note: 'Test annotation',
                rating: 'good',
                categories: ['accuracy']
            };
            mockQuery.mockResolvedValueOnce({ rows: [mockRow] });
            const result = yield (0, annotationService_1.getAnnotationById)('annotation-1');
            (0, vitest_1.expect)(result).toEqual({
                id: 'annotation-1',
                rootSpanId: 'span-1',
                note: 'Test annotation',
                rating: 'good',
                categories: ['accuracy']
            });
            (0, vitest_1.expect)(mockQuery).toHaveBeenCalledWith(vitest_1.expect.stringContaining('WHERE a.id = $1'), ['annotation-1']);
        }));
        (0, vitest_1.it)('should throw AnnotationNotFoundError when annotation does not exist', () => __awaiter(void 0, void 0, void 0, function* () {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            yield (0, vitest_1.expect)((0, annotationService_1.getAnnotationById)('nonexistent-annotation'))
                .rejects
                .toThrow(annotationService_1.AnnotationNotFoundError);
            yield (0, vitest_1.expect)((0, annotationService_1.getAnnotationById)('nonexistent-annotation'))
                .rejects
                .toThrow('Annotation with id nonexistent-annotation not found');
        }));
    });
    (0, vitest_1.describe)('createNewAnnotation', () => {
        (0, vitest_1.it)('should create a new annotation', () => __awaiter(void 0, void 0, void 0, function* () {
            const newAnnotation = {
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
            const result = yield (0, annotationService_1.createNewAnnotation)(newAnnotation);
            (0, vitest_1.expect)(result).toEqual({
                id: 'test-annotation-id',
                rootSpanId: 'span-1',
                note: 'New test annotation',
                rating: 'good',
                categories: []
            });
            (0, vitest_1.expect)(mockQuery).toHaveBeenCalledWith(vitest_1.expect.stringContaining('INSERT INTO annotations'), ['test-annotation-id', 'span-1', 'New test annotation', 'good']);
        }));
        (0, vitest_1.it)('should handle database errors during creation', () => __awaiter(void 0, void 0, void 0, function* () {
            const newAnnotation = {
                rootSpanId: 'span-1',
                note: 'Test annotation',
                rating: 'good'
            };
            mockQuery.mockRejectedValueOnce(new Error('Foreign key constraint failed'));
            yield (0, vitest_1.expect)((0, annotationService_1.createNewAnnotation)(newAnnotation))
                .rejects
                .toThrow('Database error while creating annotation');
        }));
    });
    (0, vitest_1.describe)('updateAnnotationById', () => {
        (0, vitest_1.it)('should update annotation with provided fields', () => __awaiter(void 0, void 0, void 0, function* () {
            const updates = {
                note: 'Updated note',
                rating: 'bad'
            };
            const mockReturnRow = {
                id: 'annotation-1',
                root_span_id: 'span-1',
                note: 'Updated note',
                rating: 'bad'
            };
            mockQuery.mockResolvedValueOnce({ rows: [mockReturnRow] });
            const result = yield (0, annotationService_1.updateAnnotationById)('annotation-1', updates);
            (0, vitest_1.expect)(result).toEqual({
                id: 'annotation-1',
                rootSpanId: 'span-1',
                note: 'Updated note',
                rating: 'bad',
                categories: []
            });
            (0, vitest_1.expect)(mockQuery).toHaveBeenCalledWith(vitest_1.expect.stringContaining('UPDATE annotations'), ['Updated note', 'bad', 'annotation-1']);
        }));
        (0, vitest_1.it)('should throw error when no fields provided to update', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, vitest_1.expect)((0, annotationService_1.updateAnnotationById)('annotation-1', {}))
                .rejects
                .toThrow('No fields provided to update');
            (0, vitest_1.expect)(mockQuery).not.toHaveBeenCalled();
        }));
        (0, vitest_1.it)('should throw AnnotationNotFoundError when annotation does not exist', () => __awaiter(void 0, void 0, void 0, function* () {
            const updates = { note: 'Updated note' };
            mockQuery.mockResolvedValueOnce({ rows: [] });
            yield (0, vitest_1.expect)((0, annotationService_1.updateAnnotationById)('nonexistent-annotation', updates))
                .rejects
                .toThrow(annotationService_1.AnnotationNotFoundError);
        }));
    });
    (0, vitest_1.describe)('deleteAnnotationById', () => {
        (0, vitest_1.it)('should delete annotation and return deleted data', () => __awaiter(void 0, void 0, void 0, function* () {
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
            const result = yield (0, annotationService_1.deleteAnnotationById)('annotation-1');
            (0, vitest_1.expect)(result).toEqual({
                id: 'annotation-1',
                rootSpanId: 'span-1',
                note: 'Deleted annotation',
                rating: 'good',
                categories: []
            });
            (0, vitest_1.expect)(mockQuery).toHaveBeenCalledWith(vitest_1.expect.stringContaining('DELETE FROM annotations'), ['annotation-1']);
        }));
        (0, vitest_1.it)('should throw AnnotationNotFoundError when annotation does not exist', () => __awaiter(void 0, void 0, void 0, function* () {
            mockQuery.mockResolvedValueOnce({
                rows: [],
                rowCount: 0
            });
            yield (0, vitest_1.expect)((0, annotationService_1.deleteAnnotationById)('nonexistent-annotation'))
                .rejects
                .toThrow(annotationService_1.AnnotationNotFoundError);
        }));
        (0, vitest_1.it)('should handle database errors during deletion', () => __awaiter(void 0, void 0, void 0, function* () {
            mockQuery.mockRejectedValueOnce(new Error('Database constraint violation'));
            yield (0, vitest_1.expect)((0, annotationService_1.deleteAnnotationById)('annotation-1'))
                .rejects
                .toThrow('Database error while deleting annotation with id annotation-1');
        }));
    });
});
