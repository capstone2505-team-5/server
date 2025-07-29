import { pool } from "../db/postgres";
import { RootSpan } from "../types/types";

export class RootSpanNotFoundError extends Error {
  constructor(id: string) {
    super(`Root Span with id ${id} not found`);
    this.name = 'RootSpanNotFoundError';
  }
}

export const getAllRootSpans = async (): Promise<RootSpan[]> => {
  try {
    const query = `
      SELECT 
        r.id, 
        r.trace_id, 
        r.batch_id, 
        r.input, 
        r.output, 
        r.project_id, 
        r.span_name, 
        r.start_time, 
        r.end_time, 
        r.created_at
      FROM root_spans r
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query);
    
    return result.rows.map(row => ({
      id: row.id,
      traceId: row.trace_id,
      batchId: row.batch_id,
      input: row.input,
      output: row.output,
      projectId: row.project_id,
      spanName: row.span_name,
      startTime: row.start_time,
      endTime: row.end_time, 
      created_at: row.created_at
    }));
  } catch (error) {
    console.error('Error fetching root spans:', error);
    throw new Error('Failed to fetch root spans from database');
  }
};

export const getRootSpanById = async (id: string) => {
  try {
    const query = `
      SELECT id, trace_id, input, output, project_name, span_name, start_time, end_time, created_at
      FROM root_spans 
      WHERE id = $1
    `;

    const result = await pool.query<{
      id: string;
      trace_id: string;
      input: string;
      output: string;
      project_name: string;
      span_name: string;
      start_time: string;
      end_time: string;
      created_at: string;
    }>(query, [id]);

    if (result.rows.length === 0) {
      throw new RootSpanNotFoundError(id)
    }

    const row = result.rows[0];
    return {
      id: row.id,
      traceId: row.trace_id,
      input: row.input,
      output: row.output,
      projectName: row.project_name,
      spanName: row.span_name,
      startTime: row.start_time,
      endTime: row.end_time, 
      createdAt: row.created_at
    };
  } catch (error) {
    console.error(`Error fetching root span with id ${id}:`, error);

    if (error instanceof RootSpanNotFoundError) {
      throw error;
    }

    throw new Error(`Database error while fetching root span with id ${id}`);
  }
}