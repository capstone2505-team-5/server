import { pool } from "../db/postgres";
import type { Project } from '../types/types';

export const getAllProjects = async (): Promise<Project[]> => {
   try {
    const query = `
      SELECT id, name, created_at, updated_at, trace_count
      FROM projects
      ORDER BY updated_at DESC
    `;

    const result = await pool.query(query);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      traceCount: row.trace_count,
    }));

   } catch(e) {
    console.error(e);
    throw e;
  }
};