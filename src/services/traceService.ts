import { mockTraces } from "../db/mockData";
import { pool } from "../db/postgres";
import { Trace } from "../types/types";

export class TraceNotFoundError extends Error {
  constructor(id: string) {
    super(`Trace with id ${id} not found`);
    this.name = 'TraceNotFoundError';
  }
}

export const getAllTraces = async (): Promise<Trace[]> => {
  try {
    const query = `
      SELECT id, input, output 
      FROM traces 
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query);
    
    return result.rows.map(row => ({
      id: row.id,
      input: row.input,
      output: row.output
    }));
  } catch (error) {
    console.error('Error fetching traces:', error);
    throw new Error('Failed to fetch traces from database');
  }
};

export const getTraceById = async (id: string) => {
  try {
    const query = `
      SELECT id, input, output
      FROM traces
      WHERE id = $1
    `;

    const result = await pool.query<{ id: string; input: string; output: string }>(query, [id]);

    if (result.rows.length === 0) {
      throw new TraceNotFoundError(id)
    }

    const row = result.rows[0];
    return {
      id: row.id,
      input: row.input,
      output: row.output,
    };
  } catch (error) {
    console.error(`Error fetching trace with id ${id}:`, error);

    if (error instanceof TraceNotFoundError) {
      throw error;
    }

    throw new Error(`Database error while fetching trace with id ${id}`);
  }
}

export const deleteTraceById = async (id: string): Promise<Trace | void> => {
  try {
    const query = `
      DELETE FROM traces
      WHERE id = $1
      RETURNING id, input, output
    `;

    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      throw new TraceNotFoundError(id);
    }

    const row = result.rows[0];
    return {
      id: row.id,
      input: row.input,
      output: row.output,
    }
  } catch (error) {
    console.error(`Error deleting trace with id ${id}:`, error);

    if (error instanceof TraceNotFoundError) {
      throw error;
    }

    throw new Error(`Database error while deleting trace with id ${id}`);
  }
}