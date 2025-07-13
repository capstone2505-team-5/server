import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export const initializePostgres = async () => {
  try {
    // Create the spans_extracted table and related infrastructure
    await pool.query(`
      -- Create the extracted data table
      CREATE TABLE IF NOT EXISTS spans_extracted (
        span_id VARCHAR PRIMARY KEY,
        trace_id VARCHAR,
        project_name VARCHAR,
        start_time TIMESTAMP WITH TIME ZONE,
        end_time TIMESTAMP WITH TIME ZONE,
        context JSONB,
        input_last_content TEXT,
        output_last_content TEXT,
        extracted_at TIMESTAMP DEFAULT NOW(),
        source_updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Create indexes for performance (IF NOT EXISTS handles existing indexes)
      CREATE INDEX IF NOT EXISTS idx_spans_extracted_trace_id ON spans_extracted(trace_id);
      CREATE INDEX IF NOT EXISTS idx_spans_extracted_project ON spans_extracted(project_name);
      CREATE INDEX IF NOT EXISTS idx_spans_extracted_start_time ON spans_extracted(start_time);
      CREATE INDEX IF NOT EXISTS idx_spans_extracted_updated ON spans_extracted(source_updated_at);
    `);

    // Create other tables first (before populating spans_extracted)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS annotations (
        id VARCHAR(50) PRIMARY KEY,
        span_id VARCHAR(50) REFERENCES spans_extracted(span_id) ON DELETE CASCADE,
        note TEXT,
        rating TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(50) PRIMARY KEY,
        text TEXT
      );

      CREATE TABLE IF NOT EXISTS annotation_categories (
        id VARCHAR(50) PRIMARY KEY,
        annotation_id VARCHAR(50) NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
        category_id VARCHAR(50) NOT NULL REFERENCES categories(id) ON DELETE CASCADE
      );
    `);

    // Create the trigger function (OR REPLACE handles existing function)
    await pool.query(`
      CREATE OR REPLACE FUNCTION extract_spans_io()
      RETURNS TRIGGER AS $$
      DECLARE
        trace_rec RECORD;
        project_rec RECORD;
        input_array JSONB;
        output_array JSONB;
      BEGIN
        -- Check if the record has the required attributes
        IF NEW.attributes->'input' ? 'value' AND NEW.attributes->'output' ? 'value' THEN
          
          -- Get trace information
          SELECT trace_id INTO trace_rec
          FROM traces 
          WHERE id = NEW.trace_rowid;
          
          -- Get project information
          SELECT p.name INTO project_rec
          FROM traces t
          JOIN projects p ON t.project_rowid = p.id
          WHERE t.id = NEW.trace_rowid;
          
          -- Parse the JSON arrays
          input_array := (NEW.attributes->'input'->>'value')::jsonb;
          output_array := (NEW.attributes->'output'->>'value')::jsonb;
          
          -- Insert or update the extracted data
          INSERT INTO spans_extracted (
            span_id,
            trace_id,
            project_name,
            start_time,
            end_time,
            context,
            input_last_content,
            output_last_content,
            source_updated_at
          )
          VALUES (
            NEW.span_id,
            trace_rec.trace_id,
            project_rec.name,
            NEW.start_time,
            NEW.end_time,
            input_array,
            input_array->(jsonb_array_length(input_array) - 1)->>'content',
            output_array->(jsonb_array_length(output_array) - 1)->>'content',
            NOW()
          )
          ON CONFLICT (span_id) DO UPDATE SET
            trace_id = EXCLUDED.trace_id,
            project_name = EXCLUDED.project_name,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            context = EXCLUDED.context,
            input_last_content = EXCLUDED.input_last_content,
            output_last_content = EXCLUDED.output_last_content,
            source_updated_at = NOW(),
            extracted_at = NOW();
            
        ELSE
          -- If attributes don't match criteria, remove from extracted table if it exists
          DELETE FROM spans_extracted WHERE span_id = NEW.span_id;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create the trigger (drop first if exists to avoid conflicts)
    await pool.query(`
      DROP TRIGGER IF EXISTS spans_io_extraction_trigger ON spans;
      
      CREATE TRIGGER spans_io_extraction_trigger
        AFTER INSERT OR UPDATE ON spans
        FOR EACH ROW
        EXECUTE FUNCTION extract_spans_io();
    `);

    // Clear existing data and repopulate with fresh data
    console.log('Refreshing spans_extracted table with latest data...');

    // Use DELETE instead of TRUNCATE to preserve foreign key relationships
    await pool.query('DELETE FROM spans_extracted;');

    // Repopulate with all current data
    const populationResult = await pool.query(`
      INSERT INTO spans_extracted (
        span_id,
        trace_id,
        project_name,
        start_time,
        end_time,
        context,
        input_last_content,
        output_last_content,
        source_updated_at
      )
      SELECT 
        spans.span_id,
        traces.trace_id,
        projects.name AS project_name,
        spans.start_time,
        spans.end_time,
        input_array AS context,
        input_array->(jsonb_array_length(input_array) - 1)->>'content' AS input_last_content,
        output_array->(jsonb_array_length(output_array) - 1)->>'content' AS output_last_content,
        NOW() AS source_updated_at
      FROM spans
      JOIN traces ON spans.trace_rowid = traces.id
      JOIN projects ON traces.project_rowid = projects.id
      -- Parse stringified JSON arrays from 'value'
      LEFT JOIN LATERAL (
        SELECT (spans.attributes->'input'->>'value')::jsonb AS input_array
      ) AS ia ON true
      LEFT JOIN LATERAL (
        SELECT (spans.attributes->'output'->>'value')::jsonb AS output_array
      ) AS oa ON true
      WHERE spans.attributes->'input' ? 'value'
        AND spans.attributes->'output' ? 'value';
    `);

    console.log(
      `Refreshed spans_extracted with ${populationResult.rowCount} records`,
    );

    console.log('PostgreSQL initialization completed successfully');
    console.log(
      'spans_extracted table refreshed and trigger ready for future updates',
    );
  } catch (error) {
    console.error('PostgreSQL initialization error:', error);
    throw error;
  }
};
