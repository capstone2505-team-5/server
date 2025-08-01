import { error } from "console";
import { pool } from "../db/postgres";
import { AnnotatedRootSpan, Rating } from "../types/types";

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

type RawRootSpanRow = {
  root_span_id: string;
  trace_id: string;
  batch_id: string | null;
  input: string;
  output: string;
  project_id: string;
  span_name: string;
  start_time: string;
  end_time: string;
  created_at: string;

  annotation_id: string | null;
  note: string | null;
  rating: Rating | null;
  categories: string[];
};

export const getAllRootSpans = async ({
  batchId,
  projectId,
  spanName,
  pageNumber,
  numPerPage,
}: RootSpanQueryParams): Promise<{ rootSpans: AnnotatedRootSpan[]; totalCount: number }> => {
  try {
    // Validate pagination input
    if (pageNumber < 1 || !Number.isInteger(pageNumber)) {
      throw new Error(`Invalid pageNumber: ${pageNumber}`);
    }

    if (numPerPage < 1 || numPerPage > 100 || !Number.isInteger(numPerPage)) {
      throw new Error(`Invalid numPerPage: ${numPerPage}`);
    }

    const whereClauses: string[] = [];
    const params: (string | number)[] = [];

    // if batchId is null, show only batchless spans
    if (batchId === null) {
      whereClauses.push(`r.batch_id IS NULL`);
    } else if (batchId !== undefined) {
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
      pool.query<RawRootSpanRow>(query, params),
      pool.query(countQuery, params.slice(0, params.length - 2)), // exclude limit/offset
    ]);

    const rootSpans: AnnotatedRootSpan[] = dataResult.rows.map(row => ({
      id: row.root_span_id,
      traceId: row.trace_id,
      batchId: row.batch_id,
      input: row.input,
      output: row.output,
      projectId: row.project_id,
      spanName: row.span_name,
      startTime: row.start_time,
      endTime: row.end_time,
      createdAt: row.created_at,
      annotation: row.annotation_id
        ? {
            id: row.annotation_id,
            note: row.note ?? "",                   // fallback
            rating: row.rating ?? "bad",            // fallback to valid Rating
            categories: row.categories ?? [],       // fallback
          }
        : null,
    }));

    return {
      rootSpans,
      totalCount: parseInt(countResult.rows[0].count, 10),
    };
  } catch (error) {
    console.error("Error in getAllRootSpans:", error);
    throw new Error("Failed to fetch root spans from the database");
  }
};

export const getRootSpanById = async (id: string): Promise<AnnotatedRootSpan> => {
  try {
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

      WHERE r.id = $1

      GROUP BY 
        r.id, r.trace_id, r.batch_id, r.input, r.output, 
        r.project_id, r.span_name, r.start_time, r.end_time, r.created_at,
        a.id, a.note, a.rating;
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      throw new RootSpanNotFoundError(id);
    }

    const row = result.rows[0];

    const annotatedRootSpan: AnnotatedRootSpan = {
      id: row.root_span_id,
      traceId: row.trace_id,
      batchId: row.batch_id,
      input: row.input,
      output: row.output,
      projectId: row.project_id,
      spanName: row.span_name,
      startTime: row.start_time,
      endTime: row.end_time,
      createdAt: row.created_at,
      annotation: row.annotation_id
        ? {
            id: row.annotation_id,
            note: row.note,
            rating: row.rating,
            categories: row.categories,
          }
        : null,
    };

    return annotatedRootSpan;
  } catch (error) {
    console.error(`Error fetching root span with id ${id}:`, error);

    if (error instanceof RootSpanNotFoundError) {
      throw error;
    }

    throw new Error(`Database error while fetching root span with id ${id}`);
  }
};

export const rootSpanExists = async (spanId: string): Promise<boolean> => {
  try {
    const result = await pool.query(
      `
        SELECT 1 FROM root_spans
        WHERE id = $1
      `, [spanId]);

      return (result.rowCount ?? 0) > 0;

  } catch (e) {
    console.error("Database query failed in rootSpanExists:", {
      spanId,
      error: error instanceof Error ? error.message : error
    });
    throw new Error("Failed to check root span existence");
  }
}

export const nullifyBatchId = async (spanId: string, batchId: string): Promise<boolean> => {
  try {
  const query = `
      UPDATE root_spans
      SET batch_id = NULL
      WHERE id = $1 AND batch_id = $2
    `
    const result = await pool.query(query, [spanId, batchId]);

    return (result.rowCount ?? 0) > 0;

  } catch(e) {
    console.error("Database failed to nullify batchId");
    throw new Error("Span not removed from batch")
  }
}