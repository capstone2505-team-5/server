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
import { 
  fetchRootSpans, 
  insertFormattedSpanSets 
} from './rootSpanService';
import { openai } from '../lib/openaiClient';
import { OpenAIError } from '../errors/errors';
import { jsonCleanup } from '../utils/jsonCleanup'
import { removeAnnotationFromSpans } from './annotationService';
import { sendSSEUpdate, closeSSEConnection } from './sseService';
import { FORMAT_BATCH_TIMEOUT_LIMIT, FORMAT_BATCH_CHUNK_SIZE } from '../constants/index';

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
  try {
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

    console.log(`Attempting to async format batch ${id}`);
    formatBatch(id);

    return { id, projectId, name, rootSpanIds };
  } catch (e) {
    console.error('Failed to create new batch in database.');
    throw e;
  }
};

export const getBatchSummaryById = async (batchId: string): Promise<BatchSummary> => {
  try {
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
  } catch (e) {
    console.error("failed to get batch in database", e);
    throw (e);
  }
};

/**
 * Update a batch’s name and its set of assigned rootSpanIds
 * Remove batch_id and annotations from removed spans
 */
export const updateBatchById = async (
  batchId: string,
  batchUpdate: UpdateBatch
): Promise<BatchDetail> => {
  try {
    const { 
      name: newName, 
      rootSpanIds: 
      newRootSpanIds 
    } = batchUpdate;

    // update batch name
    const result = await pool.query(
      `
        UPDATE batches 
        SET name = $1 
        WHERE id = $2 
        RETURNING id, project_id
      `,
      [newName, batchId]
    );
    if (result.rowCount === 0) {
      throw new BatchNotFoundError(batchId);
    }
    const { project_id } = result.rows[0];

    // detach old spans from batch (if not in updated root spans)
    const updateSpansResult = await pool.query(
      `
        UPDATE root_spans
        SET batch_id = NULL
        WHERE batch_id = $1
        AND id <> ALL($2)
        RETURNING id
      `,
      [batchId, newRootSpanIds]
    );

    // remove annotations from spans removed from batch
    if ((updateSpansResult.rowCount || 0) > 0) {
      const removedSpansIds = updateSpansResult.rows
        .map(s => s.id);
      await removeAnnotationFromSpans(removedSpansIds);
    }
  
    // attach new spans
    if (newRootSpanIds.length > 0) {
      await pool.query(
        `
          UPDATE root_spans
          SET batch_id = $1
          WHERE id = ANY($2)
          `, [batchId, newRootSpanIds]
      );
    }

    return { 
      id: batchId, 
      name: newName, 
      projectId: project_id, 
      rootSpanIds: newRootSpanIds ,
    };
  } catch (e) {
    console.error("failed to update batch in database", e);
    throw e;
  }
};

export const deleteBatchById = async (id: string): Promise<BatchDetail> => {
  try {
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

    await removeAnnotationFromSpans(rootSpanIds);

    return {
      id: deletedId,
      name,
      projectId: project_id,
      rootSpanIds,
    };
  } catch (e) {
    console.error("failed to delete batch in database", e);
    throw e;
  }
};

export const formatBatch = async (batchId: string) => {
  try {
    sendSSEUpdate(batchId, { 
      status: 'started', 
      message: 'Batch formatting started',
      progress: 0,
      timestamp: new Date().toISOString()
    });

    console.log(`Starting to format batch ${batchId}`);
    const spanSets = await getSpanSetsFromBatch(batchId);
    console.log(`${spanSets.length} span sets extracted from batch`);

    sendSSEUpdate(batchId, { 
      status: 'processing', 
      message: `Processing ${spanSets.length} spans with AI`,
      progress: 25 
    });

    const formattedSpanSets = await formatAllSpanSets(spanSets);
    console.log(`${formattedSpanSets.length} span sets formatted`);

    sendSSEUpdate(batchId, { 
      status: 'saving', 
      message: 'Saving formatted data to database',
      progress: 75 
    });

    const updateDbResult = await insertFormattedSpanSets(formattedSpanSets);
    console.log(`${updateDbResult.updated} root spans formatted in DB`);
    await markBatchFormatted(batchId);

    sendSSEUpdate(batchId, { 
      status: 'completed', 
      message: `Successfully formatted ${updateDbResult.updated} spans`,
      progress: 100,
      timestamp: new Date().toISOString()
    });

    setTimeout(() => closeSSEConnection(batchId), 1000);
  } catch (e) {
    console.error("batch formatting error");
    
    const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';

    sendSSEUpdate(batchId, { 
      status: 'failed', 
      message: 'Batch formatting failed',
      error: errorMessage,
      timestamp: new Date().toISOString()
    })

    setTimeout(() => closeSSEConnection(batchId), 1000);

    throw new Error("Error formatting batch");
  }
}

const getSpanSetsFromBatch = async (batchId: string): Promise<SpanSet[]> => {
  try {
    const rootSpans = await fetchRootSpans(
      {
        batchId,
        projectId: undefined,
        spanName: undefined,
        pageNumber: String(1),
        numberPerPage: String(MAX_SPANS_PER_BATCH),
      }
    );
    return extractSpanSets(rootSpans);
  } catch (e) {
    console.error("failed to get span sets sets in database", e);
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
  try {
    const CHUNK_SIZE = FORMAT_BATCH_CHUNK_SIZE;
    
    // Handle empty case
    if (spanSets.length === 0) return [];
    
    // Split into chunks of spans
    const chunks: SpanSet[][] = [];
    for (let i = 0; i < spanSets.length; i += CHUNK_SIZE) {
      chunks.push(spanSets.slice(i, i + CHUNK_SIZE));
    }
    
    console.log(`Processing ${spanSets.length} spans in ${chunks.length} chunks of max ${CHUNK_SIZE}`);
    
    // Process all chunks in parallel with Promise.all
    const chunkPromises = chunks.map((chunk, index) => {
      console.log(`Starting chunk ${index + 1}/${chunks.length} (${chunk.length} spans)`);
      return formatSpanSetsChunk(chunk);
    });
    
    const chunkResults = await Promise.all(chunkPromises);
    
    // Flatten all results into single array
    const allResults = chunkResults.flat();
    
    console.log(`Successfully formatted ${allResults.length} spans total`);
    return allResults;
  } catch (e) {
    console.error("failed to format all span sets");
    throw e;
  }
};

const formatSpanSetsChunk = async (spanSets: SpanSet[]): Promise<FormattedSpanSet[]> => {

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

  **FOR INPUTS (Narrow Display - Compact Structured Format):**
  - Parse JSON completely and format as structured markdown (same as outputs)
  - NO trailing spaces at end of lines (critical!)
  - NO empty lines between sections (critical!)
  - Use compact markdown formatting optimized for narrow width
  - **For winery/business data**: Use smaller headers (###) and compact layout
  - **Example for narrow input**:
    ### Rotta Winery
    **Address:** 250 Winery Rd, Templeton, CA 93465 | **Rating:** 9/10  
    **Description:** Known for crisp sauvignon blanc, classic gsm blends  
    **Similarity:** 0.37
    
    ### La Crema Tasting Room
    **Address:** 1237 Park Street Paso Robles CA 93446 | **Rating:** 18/10  
    **Description:** Known for innovative red field blends, crisp sauvignon blanc  
    **Similarity:** 0.37

  **FOR OUTPUTS (Wide Display - Structured Format):**
  - **JSON Arrays of Objects**: Parse and format as organized lists or tables
  - **Winery/Location Data**: Format each entry as a clear section with headers
  - **Business Listings**: Use consistent structure: Name, Address, Details, Ratings
  - **Structured Data**: Use markdown headers, lists, and clear organization
  - **Example for winery data**:
    ## Rotta Winery
    **Address:** 250 Winery Rd, Templeton, CA 93465  
    **Rating:** 9/10  
    **Description:** Known for crisp sauvignon blanc, classic gsm blends (grenache‑syrah‑mourvèdre), and velvety malbec  
    **Similarity:** 0.37
    
    ## La Crema Tasting Room  
    **Address:** 1237 Park Street Paso Robles CA 93446  
    **Rating:** 18/10  
    **Description:** Known for innovative red field blends, crisp sauvignon blanc, vibrant marsanne, and rich petit verdot  
    **Similarity:** 0.37
  
  REQUIRED OUTPUT FORMAT:
  [
    {
      "formattedInput": "markdown formatted version of input",
      "formattedOutput": "markdown formatted version of output", 
      "spanId": "exact spanId from original data"
    }
  ]
  
  IMPORTANT:
  - Return ONLY the JSON array, no other text
  - Preserve all original spanId values exactly as provided
  - Make formatting decisions based on content, not assumptions
  - If content appears to be JSON, parse it completely and format as structured markdown
  - For inputs: Parse JSON and format as compact structured markdown, NO trailing whitespace, NO empty lines
  - For outputs: Parse JSON arrays into well-organized markdown with headers and sections
  - For winery/business data: Always include Name, Address, Rating, Description, and Similarity score`;

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
      { timeout: FORMAT_BATCH_TIMEOUT_LIMIT }, // Increased from 15s to 30s
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

const markBatchFormatted = async (batchId: string) => {
  try {
    const query = `
      UPDATE batches
      SET formatted_at = NOW()
      WHERE batches.id = $1
    `
    const result = await pool.query(query, [batchId]);
    
    if (result.rowCount === 0) {
      // No rows were updated - batch probably doesn't exist
      throw new Error(`Batch ${batchId} not found`);
    } else if (result.rowCount === 1) {
      // Success - exactly one batch was updated
      console.log(`Batch ${batchId} marked as formatted`);
    }
  } catch (e) {
    console.error("Error marking batch as formatted");
    throw e;
  }
}
