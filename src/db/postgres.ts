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
      CREATE TABLE IF NOT EXISTS traces (
        id VARCHAR(50) PRIMARY KEY,
        input TEXT NOT NULL,
        output TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS queues (
        id          VARCHAR(50) PRIMARY KEY,
        name        TEXT        NOT NULL,
        created_at  TIMESTAMP   DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS root_spans (
        id VARCHAR(50) PRIMARY KEY,
        trace_id VARCHAR(50) NOT NULL,
        queue_id VARCHAR(50) REFERENCES queues(id) ON DELETE SET NULL,
        input TEXT NOT NULL,
        output TEXT NOT NULL,
        project_name VARCHAR(50) NOT NULL,
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

