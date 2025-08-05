import { error } from "console";
import { pool } from "../db/postgres";
import { DEFAULT_PAGE_QUANTITY, FIRST_PAGE, MAX_SPANS_PER_PAGE } from "../constants/index";
import type { 
  RootSpanQueryParams, 
  FormattedSpanSet, 
  FormattedRootSpan, 
  AnnotatedRootSpan, 
  Rating, 
  AllRootSpansResult ,
  FormattedRootSpansResult,
  RawRootSpanRow
} from '../types/types';

export class RootSpanNotFoundError extends Error {
  constructor(id: string) {
    super(`Root Span with id ${id} not found`);
    this.name = 'RootSpanNotFoundError';
  }
}

export const fetchRootSpans = async ({
  batchId,
  projectId,
  spanName,
  pageNumber,
  numberPerPage,
}: RootSpanQueryParams): Promise<AllRootSpansResult> => {
  const pageNum = parseInt(pageNumber as string) || FIRST_PAGE;
  const numPerPage = parseInt(numberPerPage as string) || DEFAULT_PAGE_QUANTITY;

  // Validate pagination input
  if (pageNum < 1 || !Number.isInteger(pageNum)) {
    throw new Error(`Invalid page number: ${pageNum}`);
  }

  if (numPerPage < 1 || numPerPage > MAX_SPANS_PER_PAGE || !Number.isInteger(numPerPage)) {
    throw new Error(`Page number must be a number between ${FIRST_PAGE} and ${MAX_SPANS_PER_PAGE}`);
  }

  if (!projectId && !batchId) {
    throw new Error("Either projectId or batchID is required");
  }

  try {
    const whereClauses: string[] = [];
    const params: (string | number)[] = [];

    // if batchId is undefined, show only batchless spans
    if (!batchId) {
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

    const offset = (pageNum - 1) * numPerPage;
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

export const fetchEditBatchSpans = async ({
  batchId,
  spanName,
  pageNumber,
  numberPerPage,
}: Omit<RootSpanQueryParams, "projectId">): Promise<{ rootSpans: AnnotatedRootSpan[]; totalCount: number }> => {
  const pageNum = parseInt(pageNumber as string) || FIRST_PAGE;
  const numPerPage = parseInt(numberPerPage as string) || DEFAULT_PAGE_QUANTITY;
  
  try {
    // Validate pagination input
    if (pageNum < 1 || !Number.isInteger(pageNum)) {
      throw new Error(`Invalid pageNum: ${pageNum}`);
    }

    if (numPerPage < 1 || numPerPage > MAX_SPANS_PER_PAGE || !Number.isInteger(numPerPage)) {
      throw new Error(`Invalid numPerPage: ${numPerPage}`);
    }

    const whereClauses: string[] = [];
    const params: (string | number)[] = [];

    if (batchId === undefined) {
      throw new Error("batchId required");
    } else {
      params.push(batchId);
      whereClauses.push(`r.batch_id = $${params.length} OR r.batch_id IS NULL`);
    }

    const projectId = await getProjectIdFromBatch(batchId);

    if (projectId === undefined) {
      throw new Error("Error fetching projectID from batchId");
    }else {
      params.push(projectId);
      whereClauses.push(`r.project_id = $${params.length}`);
    }

    if (spanName) {
      params.push(spanName);
      whereClauses.push(`r.span_name = $${params.length}`);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const offset = (pageNum - 1) * numPerPage;
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

export const insertFormattedSpanSets = async (formattedSpanSets: FormattedSpanSet[]): Promise<{updated: number}> => {
  try {
    // Build the VALUES clause with placeholders
    const valuesClauses: string[] = [];
    const params: string[] = [];
    
    formattedSpanSets.forEach((spanSet, index) => {
      const baseIndex = index * 3;
      valuesClauses.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`);
      params.push(spanSet.spanId, spanSet.formattedInput, spanSet.formattedOutput);
    });
    
    // FROM clause joins and updates in one operations
    const query = `
      UPDATE root_spans 
      SET 
        formatted_input = updates.formatted_input,
        formatted_output = updates.formatted_output,
        formatting_status = 'completed',
        formatted_at = NOW()
      FROM (VALUES ${valuesClauses.join(', ')}) 
      AS updates(span_id, formatted_input, formatted_output)
      WHERE root_spans.id = updates.span_id
    `;
    
    console.log(`Updating ${formattedSpanSets.length} spans with formatted content`);
    const result = await pool.query(query, params);
    return { updated: result.rowCount || 0 };
  } catch (e) {
    console.error("failed to insert formatted inputs and outputs into database", e);
    throw e;
  }
};

const getProjectIdFromBatch = async (batchId: string): Promise<string> => {
  try {
    const query = `
      SELECT project_id 
      FROM batches
      WHERE batches.id = $1
    `;

    const result = await pool.query(query, [batchId]);

    if (!result.rowCount || result.rowCount < 1) {
      throw new Error(`cannot find project_id from batch ${batchId}`);
    }

    return result.rows[0].project_id;
  } catch(e) {
    console.error(e);
    throw e;
  }
}

export const fetchFormattedRootSpans = async ({
  batchId,
  spanName,
  pageNumber,
  numberPerPage,
}: RootSpanQueryParams): Promise<FormattedRootSpansResult> => {
  try {
    const pageNum = parseInt(pageNumber as string) || FIRST_PAGE;
    const numPerPage = parseInt(numberPerPage as string) || DEFAULT_PAGE_QUANTITY;

    // Validate pagination input
    if (pageNum < 1 || !Number.isInteger(pageNum)) {
      throw new Error(`Invalid page number: ${pageNum}`);
    }

    if (numPerPage < 1 || numPerPage > MAX_SPANS_PER_PAGE || !Number.isInteger(numPerPage)) {
      throw new Error(`Page number must be a number between ${FIRST_PAGE} and ${MAX_SPANS_PER_PAGE}`);
    }

    if (!batchId) {
      throw new Error("batchID is required");
    }

    const whereClauses: string[] = [];
    const params: (string | number)[] = [];

    // if batchId is undefined, show only batchless spans
    if (!batchId) {
      whereClauses.push(`r.batch_id IS NULL`);
    } else if (batchId !== undefined) {
      params.push(batchId);
      whereClauses.push(`r.batch_id = $${params.length}`);
    }

    if (spanName) {
      params.push(spanName);
      whereClauses.push(`r.span_name = $${params.length}`);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const offset = (pageNum - 1) * numPerPage;
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
        r.formatted_input,
        r.formatted_output,
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
        r.formatted_input, r.formatted_output,
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

    const rootSpans: FormattedRootSpan[] = dataResult.rows.map(row => ({
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
      formattedInput: row.formatted_input,
      formattedOutput: row.formatted_output,
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