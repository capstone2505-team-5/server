import type { Annotation, NewAnnotation, Rating } from '../types/types';
import { pool } from '../db/postgres';
import { v4 as uuidv4 } from 'uuid';


export class AnnotationNotFoundError extends Error {
  constructor(id: string) {
    super(`Trace with id ${id} not found`);
    this.name = 'TraceNotFoundError';
  }
}

// These need to be update to join the categories table.

export const getAllAnnotations = async (): Promise<Annotation[]> => {
  try {
    const query = `
      SELECT id, trace_id, note, rating 
      FROM annotations 
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query);
    
    return result.rows.map(row => ({
      id: row.id,
      traceId: row.trace_id,
      rating: row.rating,
      note: row.note,
      categories: []
    }));
    
  } catch (error) {
    console.error('Error fetching annotations:', error);
    throw new Error('Failed to fetch annotations from database');
  }
};

export const getAnnotationById = async (id: string): Promise<Annotation> => {
  try {
    const query = `
      SELECT id, trace_id, note, rating 
      FROM annotations 
      WHERE id = $1
    `;

    const result = await pool.query<{ id: string; trace_id: string; rating: Rating, note: string }>(query, [id]);

    if (result.rows.length === 0) {
      throw new AnnotationNotFoundError(id)
    }

    const row = result.rows[0];
    return {
      id: row.id,
      traceId: row.trace_id,
      rating: row.rating,
      note: row.note,
      categories: []
    };
  } catch (error) {
    console.error(`Error fetching annotation with id ${id}:`, error);

    if (error instanceof AnnotationNotFoundError) {
      throw error;
    }

    throw new Error(`Database error while fetching annotation with id ${id}`);
  }
}

export const createNewAnnotation = async (annotation: NewAnnotation) => {
  const { traceId, note, rating } = annotation;
  const id = uuidv4();

  try {
    const query = `
      INSERT INTO annotations (id, trace_id, note, rating)
      VALUES ($1, $2, $3, $4)
      RETURNING id, trace_id, note, rating
    `;

    const result = await pool.query<{ id: string; trace_id: string; note: string; rating: Rating }>(
      query,
      [id, traceId, note, rating]
    );

    const row = result.rows[0];

    return {
      id: row.id,
      traceId: row.trace_id,
      note: row.note,
      rating: row.rating,
      categories: []
    };
  } catch (error) {
    console.error(`Error creating annotation:`, error);
    throw new Error('Database error while creating annotation');
  }
}

export const deleteAnnotationById = async (id: string): Promise<Annotation | void> => {
  try {
    const query = `
      DELETE FROM annotations
      WHERE id = $1
      RETURNING id, trace_id, note, rating
    `;

    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      throw new AnnotationNotFoundError(id);
    }

    const row = result.rows[0];
    return {
      id: row.id,
      traceId: row.trace_id,
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