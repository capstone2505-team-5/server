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
    await pool.query(`
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
        project_id VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS root_spans (
        id VARCHAR(50) PRIMARY KEY,
        trace_id VARCHAR(50) NOT NULL,
        batch_id VARCHAR(50) REFERENCES batches(id) ON DELETE SET NULL,
        input TEXT NOT NULL,
        output TEXT NOT NULL,
        project_name VARCHAR(50) NULL,
        project_id VARCHAR(50) REFERENCES projects(id) NULL,
        span_name VARCHAR(50) NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
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

  } catch (error) {
    console.error('PostgreSQL initialization error:', error);
    throw error;
  }
};

