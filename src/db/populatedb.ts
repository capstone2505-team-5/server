import traces from "../db/rawRecipeData.json"
import { pool } from "./postgres"
import { mockAnnotations } from "./mockData";
import { RootSpan, Project } from "../types/types";

export async function populateAllMockData() {
  await resetAnnotationTable(); //dev mode only
  await resetRootSpansTable(); //dev mode only
  //await populateTracesTable();
  //await populateAnnotationsTable();
}

export const populateProjectsTable = async (projects: Project[]) => {
  const client = await pool.connect();
  await client.query('BEGIN');
  try {
    for (const project of projects) {
      await client.query(
        `INSERT INTO projects (id, name, created_at, updated_at, root_span_count)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING`,
        [project.id, project.name, project.createdAt, project.updatedAt, project.rootSpanCount]);
  
    };
    await client.query('COMMIT');
    console.log('Project data successfully added');
  } catch(e) {
    console.error(e);
    throw e;
  } finally { 
    client.release();
  }
}

export const populateRootSpansTable = async (rootSpans: RootSpan[]) => {
  const client = await pool.connect();
  await client.query('BEGIN');
  try {
    for (const rootSpan of rootSpans) {
      await client.query(
        `INSERT INTO root_spans (id, trace_id, input, output, project_id, span_name, start_time, end_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [rootSpan.id, rootSpan.traceId, rootSpan.input, rootSpan.output, rootSpan.projectId,
        rootSpan.spanName, rootSpan.startTime, rootSpan.endTime]);
    }
    await client.query('COMMIT');
    console.log('Root span data successfully added');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally { 
    client.release();
  }
};

// dev mode only ... lets you easily start with new annotations each time
const resetAnnotationTable = async (): Promise<void> => {
  // Wrap in a transaction for safety
  await pool.query('BEGIN');
  try {
    await pool.query('DELETE FROM annotations');
    await pool.query('COMMIT');
  } catch (e) {
    await pool.query('ROLLBACK');
    throw e;
  }
};

// dev mode only ... lets you easily start with new annotations each time
const resetRootSpansTable = async (): Promise<void> => {
  // Wrap in a transaction for safety
  await pool.query('BEGIN');
  try {
    await pool.query('DELETE FROM root_spans');
    await pool.query('COMMIT');
  } catch (e) {
    await pool.query('ROLLBACK');
    throw e;
  }
};

async function populateTracesTable(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const trace of traces) {
      await client.query(
        `INSERT INTO traces (id, input, output)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO NOTHING`,
        [trace.id, trace.input, trace.output]
      );
    }

    await client.query('COMMIT');
    console.log('Trace data successfully added')
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error inserting traces:', err);
    throw err;
  } finally {
    client.release();
  }

}

async function populateAnnotationsTable(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const annotation of mockAnnotations) {
      await client.query(
        `INSERT INTO annotations (id, root_span_id, note, rating)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING`,
        [
          annotation.id,
          annotation.rootSpanId,
          annotation.note ?? null,
          annotation.rating
        ]
      );
    }

    await client.query('COMMIT');
    console.log('Annotation data successfully added');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error inserting annotations:', err);
    throw err;
  } finally {
    client.release();
  }
}