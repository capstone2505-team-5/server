import { pool } from "../db/postgres";
import { AnnotatedRootSpan } from "../types/types";

export class RootSpanNotFoundError extends Error {
  constructor(id: string) {
    super(`Root Span with id ${id} not found`);
    this.name = 'RootSpanNotFoundError';
  }
}

type RootSpanQueryParams = {
  batchId?: string;
  projectId?: string;
  spanName?: string;
  pageNumber: number;
  numPerPage: number;
};

export const getAllRootSpans = async ({
  batchId,
  projectId,
  spanName,
  pageNumber,
  numPerPage,
}: RootSpanQueryParams) => {
  const whereClauses: string[] = [];
  const params: any[] = [];

  if (batchId) {
    params.push(batchId);
    whereClauses.push(`r.batch_id = $${params.length}`);
  }

  if (projectId) {
    params.push(projectId);
    whereClauses.push(`r.project_id = $${params.length}`);
  }

  if (spanName) {
    params.push(spanName);
    whereClauses.push(`r.span_name = $${params.length}`);
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const offset = (pageNumber - 1) * numPerPage;
  params.push(numPerPage, offset);

  const query = `
    SELECT 
      r.id AS root_span_id,
      r.trace_id,
      r.batch_id,
      r.input,
      r.output,
      r.project_id,
      r.span_name,
      r.start_time,
      r.end_time,
      r.created_at,
      a.id AS annotation_id,
      a.note,
      a.rating,
      COALESCE(array_agg(c.text) FILTER (WHERE c.text IS NOT NULL), '{}') AS categories
    FROM root_spans r
    LEFT JOIN annotations a ON r.id = a.root_span_id
    LEFT JOIN annotation_categories ac ON a.id = ac.annotation_id
    LEFT JOIN categories c ON ac.category_id = c.id
    ${whereSQL}
    GROUP BY 
      r.id, r.trace_id, r.batch_id, r.input, r.output, 
      r.project_id, r.span_name, r.start_time, 
      r.end_time, r.created_at,
      a.id, a.note, a.rating
    ORDER BY r.created_at DESC
    LIMIT $${params.length - 1}
    OFFSET $${params.length};
  `;

  const countQuery = `
    SELECT COUNT(*) FROM root_spans r
    ${whereSQL}
  `;

  const [dataResult, countResult] = await Promise.all([
    pool.query(query, params),
    pool.query(countQuery, params.slice(0, params.length - 2)), // exclude limit/offset
  ]);

  return {
    rows: dataResult.rows.map(row => ({
      id: row.root_span_id,
      traceId: row.trace_id,
      batchId: row.batch_id,
      input: row.input,
      output: row.output,
      projectId: row.project_id,
      spanName: row.span_name,
      startTime: row.start_time,
      endTime: row.end_time,
      created_at: row.created_at,
      annotation: row.annotation_id
        ? {
            id: row.annotation_id,
            note: row.note,
            rating: row.rating,
            categories: row.categories,
          }
        : null,
    })),
    totalCount: parseInt(countResult.rows[0].count),
  };
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