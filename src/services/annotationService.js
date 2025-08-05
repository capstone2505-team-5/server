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
exports.removeAnnotationFromSpans = exports.clearCategoriesFromAnnotations = exports.deleteAnnotationById = exports.updateAnnotationById = exports.createNewAnnotation = exports.getAnnotationById = exports.getAnnotationsByBatch = exports.getAllAnnotations = exports.AnnotationNotFoundError = void 0;
const postgres_1 = require("../db/postgres");
const uuid_1 = require("uuid");
class AnnotationNotFoundError extends Error {
    constructor(id) {
        super(`Annotation with id ${id} not found`);
        this.name = 'AnnotationNotFoundError';
    }
}
exports.AnnotationNotFoundError = AnnotationNotFoundError;
const getAllAnnotations = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = `
      SELECT 
        a.id AS annotation_id,
        a.root_span_id,
        a.note,
        a.rating,
        COALESCE(array_agg(c.text) FILTER (WHERE c.text IS NOT NULL), '{}') AS categories
      FROM annotations a
      LEFT JOIN annotation_categories ac ON a.id = ac.annotation_id
      LEFT JOIN categories c ON ac.category_id = c.id
      GROUP BY a.id, a.root_span_id, a.note, a.rating
    `;
        const result = yield postgres_1.pool.query(query);
        return result.rows.map(row => ({
            id: row.annotation_id,
            rootSpanId: row.root_span_id,
            note: row.note,
            rating: row.rating,
            categories: row.categories,
        }));
    }
    catch (error) {
        console.error('Error fetching annotations with categories:', error);
        throw new Error('Failed to fetch annotations from database');
    }
});
exports.getAllAnnotations = getAllAnnotations;
const getAnnotationsByBatch = (batchId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = `
      SELECT 
        a.id AS annotation_id,
        a.root_span_id,
        a.note,
        a.rating,
        COALESCE(array_agg(c.text) FILTER (WHERE c.text IS NOT NULL), '{}') AS categories
      FROM annotations a
      LEFT JOIN annotation_categories ac ON a.id = ac.annotation_id
      LEFT JOIN categories c ON ac.category_id = c.id
      LEFT JOIN root_spans rs ON a.root_span_id = rs.id
      LEFT JOIN batches b ON rs.batch_id = b.id
      WHERE b.id = $1
      GROUP BY a.id, a.root_span_id, a.note, a.rating
    `;
        const result = yield postgres_1.pool.query(query, [batchId]);
        return result.rows.map(row => ({
            id: row.annotation_id,
            rootSpanId: row.root_span_id,
            note: row.note,
            rating: row.rating,
            categories: row.categories,
        }));
    }
    catch (error) {
        console.error('Error fetching annotations with categories:', error);
        throw new Error('Failed to fetch annotations from database');
    }
});
exports.getAnnotationsByBatch = getAnnotationsByBatch;
const getAnnotationById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = `
      SELECT 
        a.id AS annotation_id,
        a.root_span_id,
        a.note,
        a.rating,
        COALESCE(array_agg(c.text) FILTER (WHERE c.text IS NOT NULL), '{}') AS categories
      FROM annotations a
      LEFT JOIN annotation_categories ac ON a.id = ac.annotation_id
      LEFT JOIN categories c ON ac.category_id = c.id
      WHERE a.id = $1
      GROUP BY a.id, a.root_span_id, a.note, a.rating
    `;
        const result = yield postgres_1.pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new AnnotationNotFoundError(id);
        }
        const row = result.rows[0];
        return {
            id: row.annotation_id,
            rootSpanId: row.root_span_id,
            note: row.note,
            rating: row.rating,
            categories: row.categories,
        };
    }
    catch (error) {
        console.error(`Error fetching annotation with id ${id}:`, error);
        if (error instanceof AnnotationNotFoundError) {
            throw error;
        }
        throw new Error(`Database error while fetching annotation with id ${id}`);
    }
});
exports.getAnnotationById = getAnnotationById;
const createNewAnnotation = (annotation) => __awaiter(void 0, void 0, void 0, function* () {
    const { rootSpanId, note, rating } = annotation;
    const id = (0, uuid_1.v4)();
    try {
        const query = `
      INSERT INTO annotations (id, root_span_id, note, rating)
      VALUES ($1, $2, $3, $4)
      RETURNING id, root_span_id, note, rating
    `;
        const result = yield postgres_1.pool.query(query, [id, rootSpanId, note, rating]);
        const row = result.rows[0];
        return {
            id: row.id,
            rootSpanId: row.root_span_id,
            note: row.note,
            rating: row.rating,
            categories: []
        };
    }
    catch (error) {
        console.error(`Error creating annotation:`, error);
        throw new Error('Database error while creating annotation');
    }
});
exports.createNewAnnotation = createNewAnnotation;
const updateAnnotationById = (id, updates) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        if (updates.note !== undefined) {
            fields.push(`note = $${paramIndex++}`);
            values.push(updates.note);
        }
        if (updates.rating !== undefined) {
            fields.push(`rating = $${paramIndex++}`);
            values.push(updates.rating);
        }
        if (fields.length === 0) {
            throw new Error('No fields provided to update');
        }
        values.push(id); // for the WHERE clause
        const query = `
      UPDATE annotations
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, root_span_id, note, rating
    `;
        const result = yield postgres_1.pool.query(query, values);
        if (result.rows.length === 0) {
            throw new AnnotationNotFoundError(id);
        }
        const row = result.rows[0];
        return {
            id: row.id,
            rootSpanId: row.root_span_id,
            note: row.note,
            rating: row.rating,
            categories: [] // You can customize this if you're supporting categories
        };
    }
    catch (error) {
        console.error(`Error updating annotation with id ${id}:`, error);
        if (error instanceof AnnotationNotFoundError) {
            throw error;
        }
        throw new Error(`Database error while updating annotation with id ${id}`);
    }
});
exports.updateAnnotationById = updateAnnotationById;
const deleteAnnotationById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = `
      DELETE FROM annotations
      WHERE id = $1
      RETURNING id, root_span_id, note, rating
    `;
        const result = yield postgres_1.pool.query(query, [id]);
        if (result.rowCount === 0) {
            throw new AnnotationNotFoundError(id);
        }
        const row = result.rows[0];
        return {
            id: row.id,
            rootSpanId: row.root_span_id,
            note: row.note,
            rating: row.rating,
            categories: []
        };
    }
    catch (error) {
        console.error(`Error deleting annotation with id ${id}:`, error);
        if (error instanceof AnnotationNotFoundError) {
            throw error;
        }
        throw new Error(`Database error while deleting annotation with id ${id}`);
    }
});
exports.deleteAnnotationById = deleteAnnotationById;
const clearCategoriesFromAnnotations = (annotationIds) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // First, find all categories currently assigned to these annotations
        const findCategoriesQuery = `
      SELECT DISTINCT category_id
      FROM annotation_categories
      WHERE annotation_id = ANY($1)
    `;
        const categoriesResult = yield postgres_1.pool.query(findCategoriesQuery, [annotationIds]);
        const categoryIds = categoriesResult.rows.map(row => row.category_id);
        if (categoryIds.length === 0) {
            console.log('No categories to clear for these annotations');
            return 0;
        }
        // Delete the categories (CASCADE will handle annotation_categories)
        const deleteCategoriesQuery = `
      DELETE FROM categories
      WHERE id = ANY($1)
    `;
        const result = yield postgres_1.pool.query(deleteCategoriesQuery, [categoryIds]);
        console.log(`Deleted ${result.rowCount} categories (cascaded to annotation_categories)`);
        return result.rowCount;
    }
    catch (e) {
        console.error('Error clearing categories from annotations:', e);
        throw new Error('Error clearing categories from annotations');
    }
});
exports.clearCategoriesFromAnnotations = clearCategoriesFromAnnotations;
const removeAnnotationFromSpans = (rootSpans) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (rootSpans.length < 1) {
            throw new Error("No root spans provided to remove annotations");
        }
        const query = `
      DELETE 
      FROM annotations
      WHERE annotations.root_span_id = ANY($1)
    `;
        const result = yield postgres_1.pool.query(query, [rootSpans]);
        console.log(`Removed ${result.rowCount || 0} annotations from ${rootSpans.length} spans`);
        return { removed: result.rowCount || 0 }; // ← Return result
    }
    catch (e) {
        console.error("Failed to remove annotations from spans");
        throw e;
    }
});
exports.removeAnnotationFromSpans = removeAnnotationFromSpans;
