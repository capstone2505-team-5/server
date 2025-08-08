import { getPool } from "../db/postgres";
import type { ProjectSummary } from '../types/types';

export const getProjectSummaries = async (): Promise<ProjectSummary[]> => {
  const pool = await getPool();
   try {
    // Query 1: Get basic project data
    const projectQuery = `
      SELECT id, name, created_at, updated_at
      FROM projects
      ORDER BY updated_at DESC
    `;

    // Query 2: Get counts for all projects in one query
    const countsQuery = `
      SELECT 
        p.id,
        COALESCE(rs_counts.span_count, 0) AS valid_root_span_count,
        COALESCE(b_counts.batch_count, 0) AS num_batches
      FROM projects p
      LEFT JOIN (
        SELECT project_id, COUNT(*) as span_count
        FROM root_spans
        GROUP BY project_id
      ) rs_counts ON rs_counts.project_id = p.id
      LEFT JOIN (
        SELECT project_id, COUNT(*) as batch_count  
        FROM batches
        GROUP BY project_id
      ) b_counts ON b_counts.project_id = p.id
    `;

    // Execute both queries in parallel
    const [projectResult, countsResult] = await Promise.all([
      pool.query(projectQuery),
      pool.query(countsQuery)
    ]);

    // Create a map for quick lookup of counts
    const countsMap = new Map(
      countsResult.rows.map(row => [
        row.id, 
        { 
          validRootSpanCount: parseInt(row.valid_root_span_count, 10),
          numBatches: parseInt(row.num_batches, 10)
        }
      ])
    );

    // Combine the results
    return projectResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      validRootSpanCount: countsMap.get(row.id)?.validRootSpanCount || 0,
      numBatches: countsMap.get(row.id)?.numBatches || 0,
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
