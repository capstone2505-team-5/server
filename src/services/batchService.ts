import { pool } from '../db/postgres';
import { v4 as uuidv4 } from 'uuid';
import { BatchSummary, BatchDetail, NewBatch, UpdateBatch } from '../types/types';
import { BatchNotFoundError } from '../errors/errors';

export const getBatchSummariesByProject = async (projectId: string): Promise<BatchSummary[]> => {
  try {
    const query = `
      SELECT 
        b.id,
        b.project_id,
        b.name,
        b.created_at,
        COUNT(DISTINCT rs.id) AS span_count,
        COUNT(DISTINCT a.id)::float / NULLIF(COUNT(DISTINCT rs.id), 0) * 100 AS percent_annotated,
        COUNT(DISTINCT CASE WHEN a.rating = 'good' THEN a.id END)::float / NULLIF(COUNT(DISTINCT a.id), 0) * 100 AS percent_good,
        COALESCE(array_agg(DISTINCT c.text) FILTER (WHERE c.text IS NOT NULL), '{}') AS categories
      FROM batches b
      LEFT JOIN root_spans rs ON rs.batch_id = b.id
      LEFT JOIN annotations a ON a.root_span_id = rs.id
      LEFT JOIN annotation_categories ac ON a.id = ac.annotation_id
      LEFT JOIN categories c ON ac.category_id = c.id
      WHERE b.project_id = $1
      GROUP BY b.id, b.project_id, b.name, b.created_at
      ORDER BY b.created_at DESC;
    `;

    const result = await pool.query<{
      id: string;
      project_id: string;
      name: string;
      created_at: Date;
      span_count: number;
      percent_annotated: number;
      percent_good: number;
      categories: string[];
    }>(query, [projectId]);

    return result.rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      createdAt: row.created_at.toISOString(),
      spanCount: row.span_count,
      percentAnnotated: parseFloat(row.percent_annotated.toFixed(2)),
      percentGood: parseFloat(row.percent_good.toFixed(2)),
      categories: row.categories,
    }));
  } catch (error) {
    console.error('Error fetching batch summaries:', error);
    throw new Error('Failed to fetch batch summaries');
  }
};

// export const getAllBatches = async (): Promise<BatchSummary[]> => {
//   const batch = `
//     SELECT
//       b.id,
//       b.name,
//       COUNT(rs.id) AS "totalSpans",
//       COUNT(a.id) FILTER (WHERE a.rating <> 'none')   AS "annotatedCount",
//       COUNT(a.id) FILTER (WHERE a.rating = 'good')    AS "goodCount"
//     FROM batches b
//     LEFT JOIN root_spans rs
//       ON rs.batch_id = b.id
//     LEFT JOIN annotations a
//       ON a.root_span_id = rs.id
//     GROUP BY b.id, b.name
//     ORDER BY b.name;
//   `;

//   const result = await pool.query(batch);

//   return result.rows.map(row => ({
//     id: row.id,
//     name: row.name,
//     totalSpans: parseInt(row.totalSpans, 10),
//     annotatedCount: parseInt(row.annotatedCount, 10),
//     goodCount: parseInt(row.goodCount, 10)
//   }));
// };

export const createNewBatch = async (
  batch: NewBatch
): Promise<BatchDetail> => {
  const id = uuidv4();
  const { name, rootSpanIds, projectId } = batch;

  // insert new batch record
  await pool.query(
    `INSERT INTO batches (id, project_id, name) VALUES ($1, $2, $3)`,
    [id, projectId, name]
  );

  // If there are rootSpanIds, attach them to this batch
  if (rootSpanIds.length > 0) {
    await pool.query(
      `UPDATE root_spans
       SET batch_id = $1
       WHERE id = ANY($2)`,
      [id, rootSpanIds]
    );
  }

  return { id, projectId, name, rootSpanIds };
};

export const getBatchSummaryById = async (batchId: string): Promise<BatchSummary> => {
  const query = `
    SELECT 
      b.id,
      b.project_id,
      b.name,
      COUNT(DISTINCT rs.id) AS span_count,
      COUNT(DISTINCT a.id)::float / NULLIF(COUNT(DISTINCT rs.id), 0) * 100 AS percent_annotated,
      COUNT(DISTINCT CASE WHEN a.rating = 'good' THEN a.id END)::float / NULLIF(COUNT(DISTINCT a.id), 0) * 100 AS percent_good,
      COALESCE(array_agg(DISTINCT c.text) FILTER (WHERE c.text IS NOT NULL), '{}') AS categories
    FROM batches b
    LEFT JOIN root_spans rs ON rs.batch_id = b.id
    LEFT JOIN annotations a ON a.root_span_id = rs.id
    LEFT JOIN annotation_categories ac ON ac.annotation_id = a.id
    LEFT JOIN categories c ON c.id = ac.category_id
    WHERE b.id = $1
    GROUP BY b.id, b.project_id, b.name
  `;

  const result = await pool.query(query, [batchId]);

  if (result.rowCount === 0) {
    throw new BatchNotFoundError(batchId);
  }

  return result.rows[0] as BatchSummary;
};

/**
 * Update a batch’s name and its set of assigned rootSpanIds
 */
export const updateBatchById = async (
  id: string,
  batch: UpdateBatch
): Promise<BatchDetail> => {
  const { name, rootSpanIds } = batch;

  // update and get project_id
  const result = await pool.query(
    `UPDATE batches SET name = $1 WHERE id = $2 RETURNING id, project_id`,
    [name, id]
  );
  if (result.rowCount === 0) {
    throw new BatchNotFoundError(id);
  }

  const { project_id } = result.rows[0];

  // detach old spans
  await pool.query(
    `UPDATE root_spans
       SET batch_id = NULL
     WHERE batch_id = $1
       AND id <> ALL($2)`,
    [id, rootSpanIds]
  );

  // attach new spans
  if (rootSpanIds.length > 0) {
    await pool.query(
      `UPDATE root_spans
         SET batch_id = $1
       WHERE id = ANY($2)`,
      [id, rootSpanIds]
    );
  }

  return { id, name, projectId: project_id, rootSpanIds };
};

export const deleteBatchById = async (id: string): Promise<BatchDetail> => {
  // fetch spans before deletion
  const spansResult = await pool.query<{ id: string }>(
    `SELECT id FROM root_spans WHERE batch_id = $1`,
    [id]
  );
  const rootSpanIds = spansResult.rows.map(r => r.id);

  // delete batch and return metadata
  const result = await pool.query<{
    id: string;
    name: string;
    project_id: string;
  }>(`
    DELETE FROM batches
    WHERE id = $1
    RETURNING id, name, project_id
  `, [id]);

  if (result.rowCount === 0) {
    throw new BatchNotFoundError(id);
  }

  const { id: deletedId, name, project_id } = result.rows[0];

  return {
    id: deletedId,
    name,
    projectId: project_id,
    rootSpanIds,
  };
};

