import traces from "../db/rawRecipeData.json"
import { pool } from "./postgres"
import { mockAnnotations } from "./mockData";

export async function populateAllMockData() {
  await populateTracesTable()
  await populateAnnotationsTable()
}

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
        `INSERT INTO annotations (id, trace_id, note, rating)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING`,
        [
          annotation.id,
          annotation.traceId,
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