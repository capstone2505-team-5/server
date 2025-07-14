import { pool } from "../db/postgres";
import { Span } from "../types/types";

export class SpanNotFoundError extends Error {
  constructor(id: string) {
    super(`Span with id ${id} not found`);
    this.name = 'SpanNotFoundError';
  }
}

export const getAllSpans = async (): Promise<Span[]> => {
  try {
    const query = `
      SELECT id, input, output
      FROM spans_extracted
      ORDER BY extracted_at DESC
    `;
    
    const result = await pool.query(query);
    
    return result.rows.map(row => ({
      id: row.id,
      trace_id: row.trace_id,
      project_name: row.project_name,
      input: row.input,
      output: row.output,
      start_time: row.start_time,
      end_time: row.end_time,
      context: row.context,
      extracted_at: row.extracted_at,
    }));
  } catch (error) {
    console.error('Error fetching spans:', error);
    throw new Error('Failed to fetch spans from database');
  }
};

export const getSpanById = async (id: string) => {
  try {
    const query = `
      SELECT id, input, output
      FROM spans_extracted
      WHERE id = $1
    `;

    const result = await pool.query<{ id: string; input: string; output: string }>(query, [id]);

    if (result.rows.length === 0) {
      throw new SpanNotFoundError(id)
    }

    const row = result.rows[0];
    return {
      id: row.id,
      input: row.input,
      output: row.output,
    };
  } catch (error) {
    console.error(`Error fetching span with id ${id}:`, error);

    if (error instanceof SpanNotFoundError) {
      throw error;
    }

    throw new Error(`Database error while fetching span with id ${id}`);
  }
}

export const deleteSpanById = async (id: string): Promise<Span | void> => {
  try {
    const query = `
      DELETE FROM spans_extracted
      WHERE id = $1
      RETURNING id, input, output
    `;

    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      throw new SpanNotFoundError(id);
    }

    const row = result.rows[0];
    return {
      id: row.id,
      trace_id: row.trace_id,
      project_name: row.project_name,
      input: row.input,
      output: row.output,
      start_time: row.start_time,
      end_time: row.end_time,
      context: row.context,
      extracted_at: row.extracted_at,
    }
  } catch (error) {
    console.error(`Error deleting span with id ${id}:`, error);

    if (error instanceof SpanNotFoundError) {
      throw error;
    }

    throw new Error(`Database error while deleting span with id ${id}`);
  }
}