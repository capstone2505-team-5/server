import type { Annotation, NewAnnotation, Rating } from '../types/types';
import { getPool } from '../db/postgres';
import { v4 as uuidv4 } from 'uuid';


export class AnnotationNotFoundError extends Error {
  constructor(id: string) {
    super(`Annotation with id ${id} not found`);
    this.name = 'AnnotationNotFoundError';
  }
}

export const getAllAnnotations = async (): Promise<Annotation[]> => {
  const pool = await getPool();
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

    const result = await pool.query<{
      annotation_id: string;
      root_span_id: string;
      note: string;
      rating: Rating;
      categories: string[];
    }>(query);

    return result.rows.map(row => ({
      id: row.annotation_id,
      rootSpanId: row.root_span_id,
      note: row.note,
      rating: row.rating,
      categories: row.categories,
    }));
  } catch (error) {
    console.error('Error fetching annotations with categories:', error);
    throw new Error('Failed to fetch annotations from database');
  }
};

export const getAnnotationsByBatch = async (batchId: string): Promise<Annotation[]> => {
  const pool = await getPool();
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

    const result = await pool.query<{
      annotation_id: string;
      root_span_id: string;
      note: string;
      rating: Rating;
      categories: string[];
    }>(query, [batchId]);

    return result.rows.map(row => ({
      id: row.annotation_id,
      rootSpanId: row.root_span_id,
      note: row.note,
      rating: row.rating,
      categories: row.categories,
    }));
  } catch (error) {
    console.error('Error fetching annotations with categories:', error);
    throw new Error('Failed to fetch annotations from database');
  }
};

export const getAnnotationById = async (id: string): Promise<Annotation> => {
  const pool = await getPool();
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

    const result = await pool.query<{
      annotation_id: string;
      root_span_id: string;
      note: string;
      rating: Rating;
      categories: string[];
    }>(query, [id]);

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
  } catch (error) {
    console.error(`Error fetching annotation with id ${id}:`, error);

    if (error instanceof AnnotationNotFoundError) {
      throw error;
    }

    throw new Error(`Database error while fetching annotation with id ${id}`);
  }
};


export const createNewAnnotation = async (annotation: NewAnnotation): Promise<Annotation> => {
  const pool = await getPool();
  const { rootSpanId, note, rating } = annotation;
  const id = uuidv4();

  try {
    const query = `
      INSERT INTO annotations (id, root_span_id, note, rating)
      VALUES ($1, $2, $3, $4)
      RETURNING id, root_span_id, note, rating
    `;

    const result = await pool.query
    <
      { 
        id: string; 
        root_span_id: string; 
        note: string; 
        rating: Rating 
      }
    >(
      query,
      [id, rootSpanId, note, rating]
    );

    const row = result.rows[0];

    return {
      id: row.id,
      rootSpanId: row.root_span_id,
      note: row.note,
      rating: row.rating,
      categories: []
    };
  } catch (error) {
    console.error(`Error creating annotation:`, error);
    throw new Error('Database error while creating annotation');
  }
}

export const updateAnnotationById = async (id: string, updates: Partial<Annotation>) => {
  const pool = await getPool();
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

    const result = await pool.query<{ id: string; root_span_id: string; note: string; rating: Rating }>(
      query,
      values
    );

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
  } catch (error) {
    console.error(`Error updating annotation with id ${id}:`, error);

    if (error instanceof AnnotationNotFoundError) {
      throw error;
    }

    throw new Error(`Database error while updating annotation with id ${id}`);
  }
}

export const deleteAnnotationById = async (id: string): Promise<Annotation | void> => {
  const pool = await getPool();
  try {
    const query = `
      DELETE FROM annotations
      WHERE id = $1
      RETURNING id, root_span_id, note, rating
    `;

    const result = await pool.query(query, [id]);

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
    }
  } catch (error) {
    console.error(`Error deleting annotation with id ${id}:`, error);

    if (error instanceof AnnotationNotFoundError) {
      throw error;
    }

    throw new Error(`Database error while deleting annotation with id ${id}`);
  }
}

export const clearCategoriesFromAnnotations = async (annotationIds: string[]) => {
  const pool = await getPool();
  try {
    // First, find all categories currently assigned to these annotations
    const findCategoriesQuery = `
      SELECT DISTINCT category_id
      FROM annotation_categories
      WHERE annotation_id = ANY($1)
    `;

    const categoriesResult = await pool.query(findCategoriesQuery, [annotationIds]);
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

    const result = await pool.query(deleteCategoriesQuery, [categoryIds]);
    
    console.log(`Deleted ${result.rowCount} categories (cascaded to annotation_categories)`);
    return result.rowCount;

  } catch (e) {
    console.error('Error clearing categories from annotations:', e);
    throw new Error('Error clearing categories from annotations');
  }
};

export const removeAnnotationFromSpans = async (rootSpans: string[]) => {
  const pool = await getPool();
  try {
    if (rootSpans.length < 1) {
      throw new Error("No root spans provided to remove annotations")
    }

    const query = `
      DELETE 
      FROM annotations
      WHERE annotations.root_span_id = ANY($1)
    `
    const result = await pool.query(query, [rootSpans]);
    console.log(`Removed ${result.rowCount || 0} annotations from ${rootSpans.length} spans`);
    return { removed: result.rowCount || 0 }; // ← Return result
  } catch(e) {
    console.error("Failed to remove annotations from spans");
    throw e;
  }
}
