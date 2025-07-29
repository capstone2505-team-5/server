import { pool } from "../db/postgres";
import type { ProjectSummary } from '../types/types';

export const getProjectSummaries = async (): Promise<ProjectSummary[]> => {
   try {
    const query = `
      SELECT 
        p.id, 
        p.name, 
        p.created_at, 
        p.updated_at, 
        p.root_span_count,
        COUNT(b.id) AS num_batches
      FROM projects p
      LEFT JOIN batches b ON b.project_id = p.id
      GROUP BY p.id, p.name, p.created_at, p.updated_at, p.root_span_count
      ORDER BY p.updated_at
    `;

    const result = await pool.query(query);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      rootSpanCount: row.root_span_count,
      numBatches: parseInt(row.num_batches, 10),
    }));

   } catch (e: unknown) {
    if (e instanceof Error) {
      console.error('getProjectSummaries error:', e.message);
    } else {
      console.error('Unknown error in getProjectSummaries:', e);
    }
    throw new Error('Failed to load project summaries from the database.');
  }
};

export const tempProjectIdFiller = async () => {
  try {
    console.log('🔧 Starting tempProjectIdFiller...');

    const updateQuery = `
      UPDATE root_spans
      SET project_id = p.id
      FROM projects p
      WHERE root_spans.project_name = p.name
      AND root_spans.project_id IS NULL;
    `;

    const result = await pool.query(updateQuery);

    console.log(`✅ tempProjectIdFiller updated ${result.rowCount} rows.`);
  } catch (error) {
    console.error('❌ Error in tempProjectIdFiller:', error);
    throw error;
  }
}