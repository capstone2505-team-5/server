import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// 1. Declare the pool variable in the global scope, but don't initialize it yet.
let pool: Pool | null = null;

const dbConfig = {
  host: process.env.AWS_SAM_LOCAL === 'true' ? 'host.docker.internal' : process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Lambda-specific pool settings
  max: 1, // Only allow 1 connection in the pool for a single Lambda container
  idleTimeoutMillis: 10000, // Close idle clients after 10 seconds
  connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection could not be established
};

/**
 * Returns a singleton instance of the PostgreSQL connection pool.
 * It creates the pool on the first call and reuses it for subsequent calls.
 * This is the core of the Lambda-Tuned Pool pattern.
 */
export const getPool = () => {
  if (!pool) {
    console.log('No existing pool found. Creating new pool...');
    pool = new Pool(dbConfig);
  }
  return pool;
};

// We keep the initialization logic separate. This should not be run by the Lambda function
// at runtime. It should be run as a separate migration/setup step during deployment.
export const initializePostgres = async () => {
  const initPool = new Pool(dbConfig);
  try {
    await initPool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(50) PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NULL,
        root_span_count INTEGER NOT NULL,
        last_cursor TEXT NULL
      );
      
      CREATE TABLE IF NOT EXISTS batches (
        id VARCHAR(50) PRIMARY KEY,
        project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        formatted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS root_spans (
        id VARCHAR(50) PRIMARY KEY,
        trace_id VARCHAR(50) NOT NULL,
        batch_id VARCHAR(50) REFERENCES batches(id) ON DELETE SET NULL,
        input TEXT NOT NULL,
        output TEXT NOT NULL,
        project_id VARCHAR(50) REFERENCES projects(id) NOT NULL,
        span_name VARCHAR(50) NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        formatted_input TEXT,
        formatted_output TEXT,
        formatting_status VARCHAR(20) DEFAULT 'pending',
        formatted_at TIMESTAMP
      );  

      CREATE TABLE IF NOT EXISTS annotations (
        id VARCHAR(50) PRIMARY KEY,
        root_span_id VARCHAR(50) REFERENCES root_spans(id) ON DELETE CASCADE,
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
    console.log('PostgreSQL tables initialized successfully.');
  } catch (error) {
    console.error('PostgreSQL initialization error:', error);
    throw error;
  } finally {
    await initPool.end();
  }
};

// In your application code, you will now import `getPool` and call it
// to get the pool instance, like so:
// import { getPool } from './db/postgres';
// const pool = getPool();
// const result = await pool.query('SELECT NOW()');
