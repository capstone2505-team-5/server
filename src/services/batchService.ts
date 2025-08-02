import { pool } from '../db/postgres';
import { v4 as uuidv4 } from 'uuid';
import type { 
  FormattedSpanSet,
  SpanSet, 
  AllRootSpansResult, 
  BatchSummary, 
  BatchDetail, 
  NewBatch, 
  UpdateBatch 
} from '../types/types';
import { BatchNotFoundError } from '../errors/errors';
import { MAX_SPANS_PER_BATCH } from '../constants/index';
import { getAllRootSpans, insertFormattedSpanSets } from './rootSpanService';
import { openai } from '../lib/openaiClient';
import { OpenAIError } from '../errors/errors';
import { jsonCleanup } from '../utils/jsonCleanup'

export const getBatchSummariesByProject = async (projectId: string): Promise<BatchSummary[]> => {
  try {
    const query = `
      SELECT 
        b.id,
        b.project_id,
        b.name,
        b.created_at,
        COUNT(DISTINCT rs.id) AS valid_root_span_count,
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
      valid_root_span_count: number;
      percent_annotated: number | null;
      percent_good: number | null;
      categories: string[];
    }>(query, [projectId]);

    return result.rows.map((row): BatchSummary => ({
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      createdAt: row.created_at.toISOString(),
      validRootSpanCount: row.valid_root_span_count,
      percentAnnotated: row.percent_annotated !== null ? parseFloat(row.percent_annotated.toFixed(2)) : null,
      percentGood: row.percent_good !== null ? parseFloat(row.percent_good.toFixed(2)) : null,
      categories: row.categories,
    }));
  } catch (error) {
    console.error('Error fetching batch summaries:', error);
    throw new Error('Failed to fetch batch summaries');
  }
};

export const createNewBatch = async (
  batch: NewBatch
): Promise<BatchDetail> => {
  const id = uuidv4();
  const { name, rootSpanIds, projectId } = batch;

   // Validate batch size limit
  if (rootSpanIds.length > 150) {
    throw new Error(`Batch size cannot exceed 150 root spans. Provided: ${rootSpanIds.length}`);
  }

  // Validate that none of the root spans already belong to a batch
  if (rootSpanIds.length > 0) {
    const checkQuery = `
      SELECT id, batch_id 
      FROM root_spans 
      WHERE id = ANY($1) AND batch_id IS NOT NULL
    `;
    
    const conflictResult = await pool.query(checkQuery, [rootSpanIds]);
    
    if (conflictResult.rows.length > 0) {
      const conflictingSpans = conflictResult.rows.map(row => row.id);
      throw new Error(`Root spans already assigned to batches: ${conflictingSpans.join(', ')}`);
    }
  }

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
  batchUpdate: UpdateBatch
): Promise<BatchDetail> => {
  const { name, rootSpanIds } = batchUpdate;
  console.log('batchUpdate', batchUpdate);

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

export const formatBatch = async (batchId: string) => {
  try {
    console.log(`Starting to format batch ${batchId}`);
    const spanSets = await getSpanSets(batchId);
    console.log(`${spanSets.length} span sets extracted from batch`);
    const formattedSpanSets = await formatAllSpanSets(spanSets);
    console.log(`${formattedSpanSets} span sets formatted`);
    const updateDbResult = await insertFormattedSpanSets(formattedSpanSets);
    console.log(`${updateDbResult.updated} root spans updated in DB`);
    
    // if (result) {
    //   console.log(`Batch ${batchId} has been formatted`);
    // }
  } catch (e) {
    console.error("batch formatting error");
    throw new Error("Error formatting batch");
  }
}

const getSpanSets = async (batchId: string): Promise<SpanSet[]> => {
  const projectId = await getProjectIdFromBatch(batchId);
  const rootSpans = await getAllRootSpans(
    {
      batchId,
      projectId,
      pageNumber: 1,
      numPerPage: MAX_SPANS_PER_BATCH,
    }
  );
  return extractSpanSets(rootSpans);
}

const getProjectIdFromBatch = async (batchId: string): Promise<string> => {
  try {
    const query = `
      SELECT project_id 
      FROM batches
      WHERE batches.id = $1
    `;

    const result = await pool.query(query, [batchId]);
    return result.rows[0].project_id;
  } catch(e) {
    console.error(e);
    throw e;
  }
}

const extractSpanSets = (rootSpanResults: AllRootSpansResult): SpanSet[] => {
  const annotatedRootSpans = rootSpanResults.rootSpans;

  return annotatedRootSpans.map(aRS => {
    return {
      input: aRS.input,
      output: aRS.output,
      spanId: aRS.id,
    }
  });
}

const formatAllSpanSets = async (spanSets: SpanSet[]): Promise<FormattedSpanSet[]> => {
  const CHUNK_SIZE = 30;
  
  // Handle empty case
  if (spanSets.length === 0) return [];
  
  // Split into chunks of 30
  const chunks: SpanSet[][] = [];
  for (let i = 0; i < spanSets.length; i += CHUNK_SIZE) {
    chunks.push(spanSets.slice(i, i + CHUNK_SIZE));
  }
  
  console.log(`Processing ${spanSets.length} spans in ${chunks.length} chunks of max ${CHUNK_SIZE}`);
  
  // Process all chunks in parallel with Promise.all
  const chunkPromises = chunks.map((chunk, index) => {
    console.log(`Starting chunk ${index + 1}/${chunks.length} (${chunk.length} spans)`);
    return formatSpanSets(chunk);
  });
  
  const chunkResults = await Promise.all(chunkPromises);
  
  // Flatten all results into single array
  const allResults = chunkResults.flat();
  
  console.log(`Successfully formatted ${allResults.length} spans total`);
  return allResults;
};

const formatSpanSets = async (spanSets: SpanSet[]): Promise<FormattedSpanSet[]> => {

  const systemPrompt = `
  You are a data formatter. I will provide you with an array of objects, 
  each containing "input", "output", and "spanId" properties. 
  Your task is to format the input and output into clean, readable 
  Markdown while preserving the spanId.

  INSTRUCTIONS:
  1. Analyze each input/output to determine its content type (email, recipe, JSON, code, plain text, etc.)
  2. Format each as clean, readable Markdown appropriate for its content type
  3. Return valid JSON only - no explanations or markdown code blocks around your response
  
  EXAMPLE INPUT FORMAT:
  [
    {
      "input": "{"user_input":"red wine opolo winery $50 budget","limit":4,"min_similarity":0.3}",
      "output": "{{"Opolo Vineyards","7110 Vineyard Dr, Paso Robles, CA 93446","9","10","Showcases crisp sauvignon blanc and rich petit verdot.","0.6053682095251376"}}",
      "spanId": "0008f44ad2f382fa"
    },
    {
      "input": "Subject: Meeting Tomorrow\\nFrom: john@company.com\\nHi team, let's meet at 2pm to discuss the project.",
      "output": "Meeting confirmed for 2pm tomorrow. Conference room B is booked.",
      "spanId": "abc123def456"
    }
  ]
  
  FORMATTING GUIDELINES:
  - **JSON/Code**: Remove the code and technical syntax and make it into a human readable format
  - **Emails**: Format with proper headers (From:, To:, Subject:, etc.)
  - **Recipes**: Use headers, ingredient lists, numbered steps
  - **Lists**: Use proper Markdown lists (- or 1.)
  - **Structured data**: Use tables or organized sections
  - **Plain text**: Clean up spacing, add line breaks for readability
  - **Mixed content**: Break into logical sections with headers
  
  REQUIRED OUTPUT FORMAT:
  [
    {
      "formattedInput": "markdown formatted version of input",
      "formattedOutput": "markdown formatted version of output", 
      "spanId": "exact spanId from original data"
    }
  ]
  
  IMPORTANT:
  - All formattedInputs should for formatted identically
  - All formattedOutputs should be formatted identically
  - Return ONLY the JSON array, no other text
  - Preserve all original spanId values exactly as provided
  - Make formatting decisions based on content, not assumptions
  - If content appears to be JSON, parse it, but remove all code and technical syntax other than markdown
  - If content is already well-formatted, improve it but don't over-complicate
  - Use appropriate Markdown elements: headers (#), lists, code blocks (\`\`\`), tables, etc.`;

  const userContent = JSON.stringify(spanSets, null, 2);

  let raw: string;
  try {
    const completion = await openai.chat.completions.create(
      {
        model: 'gpt-4o',
        temperature: 0,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userContent },
        ],
      }, 
      { timeout: 30_000 }, // Increased from 15s to 30s
    );
    raw = completion.choices[0].message.content ?? '';
  } catch (err) {
    console.error('OpenAI request failed:', err);
    throw new OpenAIError('OpenAI request failed');
  }

  const clean = jsonCleanup(raw);

  try {
    const arr = JSON.parse(clean);
    if (!Array.isArray(arr)) throw new Error('Not an array');
    return arr;
  } catch (e) {
    console.error('Bad JSON from model:', clean);
    throw e;
  }
};
