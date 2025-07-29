import { pool } from '../db/postgres';
import { v4 as uuidv4 } from 'uuid';
import { BatchSummary, BatchDetail, NewBatch } from '../types/types';
import { BatchNotFoundError } from '../errors/errors';


export const getAllBatches = async (): Promise<BatchSummary[]> => {
  const batch = `
    SELECT
      b.id,
      b.name,
      COUNT(rs.id) AS "totalSpans",
      COUNT(a.id) FILTER (WHERE a.rating <> 'none')   AS "annotatedCount",
      COUNT(a.id) FILTER (WHERE a.rating = 'good')    AS "goodCount"
    FROM batches b
    LEFT JOIN root_spans rs
      ON rs.batch_id = b.id
    LEFT JOIN annotations a
      ON a.root_span_id = rs.id
    GROUP BY b.id, b.name
    ORDER BY b.name;
  `;

  const result = await pool.query(batch);

  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    totalSpans: parseInt(row.totalSpans, 10),
    annotatedCount: parseInt(row.annotatedCount, 10),
    goodCount: parseInt(row.goodCount, 10)
  }));
};

export const createNewBatch = async (
  batch: NewBatch
): Promise<BatchDetail> => {
  const id = uuidv4();
  const { name, rootSpanIds } = batch;

  // insert new batch record
  await pool.query(
    `INSERT INTO batches (id, name) VALUES ($1, $2)`,
    [id, name]
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

  return { id, name, rootSpanIds };
};

export const getBatchById = async (id: string): Promise<BatchDetail> => {
  // 1) fetch batch record
  const result = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM batches WHERE id = $1`,
    [id]
  );

  if (result.rowCount === 0) {
    throw new BatchNotFoundError(id);
  }
  const { name } = result.rows[0];

  // 2) fetch assigned spans
  const spans = await pool.query<{ id: string }>(
    `SELECT id FROM root_spans WHERE batch_id = $1`,
    [id]
  );
  const rootSpanIds = spans.rows.map(span => span.id);

  return { id, name, rootSpanIds };
};

/**
 * Update a batch’s name and its set of assigned rootSpanIds
 */
export const updateBatchById = async (
  id: string,
  batch: NewBatch
): Promise<BatchDetail> => {
  const { name, rootSpanIds } = batch;

  // ensure batch exists & update its name
  const result = await pool.query(
    `UPDATE batches SET name = $1 WHERE id = $2 RETURNING id`,
    [name, id]
  );
  if (result.rowCount === 0) {
    throw new BatchNotFoundError(id);
  }

  // detach any spans no longer in this batch
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

  return { id, name, rootSpanIds };
};

export const deleteBatchById = async (id: string): Promise<void> => {
  // ensure batch exists
  const result = await pool.query(
    `DELETE FROM batches WHERE id = $1 RETURNING id`,
    [id]
  );
  if (result.rowCount === 0) {
    throw new BatchNotFoundError(id);
  }

  // detach all rootSpans from this batch
  await pool.query(
    `UPDATE root_spans SET batch_id = NULL WHERE batch_id = $1`,
    [id]
  );
};
