import { pool } from '../db/postgres';
import { v4 as uuidv4 } from 'uuid';
import { QueueSummary, QueueDetail, NewQueue } from '../types/types';
import { QueueNotFoundError } from '../errors/errors';


export const getAllQueues = async (): Promise<QueueSummary[]> => {
  const query = `
    SELECT
      q.id,
      q.name,
      COUNT(rs.id) AS "totalSpans",
      COUNT(a.id) FILTER (WHERE a.rating <> 'none')   AS "annotatedCount",
      COUNT(a.id) FILTER (WHERE a.rating = 'good')    AS "goodCount"
    FROM queues q
    LEFT JOIN root_spans rs
      ON rs.queue_id = q.id
    LEFT JOIN annotations a
      ON a.root_span_id = rs.id
    GROUP BY q.id, q.name
    ORDER BY q.name;
  `;

  const result = await pool.query(query);

  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    totalSpans: parseInt(row.totalSpans, 10),
    annotatedCount: parseInt(row.annotatedCount, 10),
    goodCount: parseInt(row.goodCount, 10)
  }));
};

export const createNewQueue = async (
  queue: NewQueue
): Promise<QueueDetail> => {
  const id = uuidv4();
  const { name, rootSpanIds } = queue;

  // insert new queue record
  await pool.query(
    `INSERT INTO queues (id, name) VALUES ($1, $2)`,
    [id, name]
  );

  // If there are rootSpanIds, attach them to this queue
  if (rootSpanIds.length > 0) {
    await pool.query(
      `UPDATE root_spans
         SET queue_id = $1
       WHERE id = ANY($2)`,
      [id, rootSpanIds]
    );
  }

  return { id, name, rootSpanIds };
};

export const getQueueById = async (id: string): Promise<QueueDetail> => {
  // 1) fetch queue record
  const result = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM queues WHERE id = $1`,
    [id]
  );

  if (result.rowCount === 0) {
    throw new QueueNotFoundError(id);
  }
  const { name } = result.rows[0];

  // 2) fetch assigned spans
  const spans = await pool.query<{ id: string }>(
    `SELECT id FROM root_spans WHERE queue_id = $1`,
    [id]
  );
  const rootSpanIds = spans.rows.map(span => span.id);

  return { id, name, rootSpanIds };
};

/**
 * Update a queue’s name and its set of assigned rootSpanIds
 */
export const updateQueueById = async (
  id: string,
  queue: NewQueue
): Promise<QueueDetail> => {
  const { name, rootSpanIds } = queue;

  // ensure queue exists & update its name
  const result = await pool.query(
    `UPDATE queues SET name = $1 WHERE id = $2 RETURNING id`,
    [name, id]
  );
  if (result.rowCount === 0) {
    throw new QueueNotFoundError(id);
  }

  // detach any spans no longer in this queue
  await pool.query(
    `UPDATE root_spans
       SET queue_id = NULL
     WHERE queue_id = $1
       AND id <> ALL($2)`,
    [id, rootSpanIds]
  );

  // attach new spans
  if (rootSpanIds.length > 0) {
    await pool.query(
      `UPDATE root_spans
         SET queue_id = $1
       WHERE id = ANY($2)`,
      [id, rootSpanIds]
    );
  }

  return { id, name, rootSpanIds };
};

export const deleteQueueById = async (id: string): Promise<void> => {
  // ensure queue exists
  const result = await pool.query(
    `DELETE FROM queues WHERE id = $1 RETURNING id`,
    [id]
  );
  if (result.rowCount === 0) {
    throw new QueueNotFoundError(id);
  }

  // detach all rootSpans from this queue
  await pool.query(
    `UPDATE root_spans SET queue_id = NULL WHERE queue_id = $1`,
    [id]
  );
};
