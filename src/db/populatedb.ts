import traces from "../db/rawRecipeData.json"
import { pool } from "./postgres"

export async function populateAllMockData() {
  await populateTracesTable()
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