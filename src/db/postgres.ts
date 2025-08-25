import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

dotenv.config();

// 1. Declare the pool variable in the global scope, but don't initialize it yet.
let pool: Pool | null = null;
let dbConfig: any = null;

// Initialize AWS Secrets Manager client
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Fetches database credentials from AWS Secrets Manager
 */
const getDbCredentialsFromSecrets = async () => {
  try {
    const secretName = process.env.RDS_CREDENTIALS_SECRET_NAME;
    if (!secretName) {
      throw new Error('RDS_CREDENTIALS_SECRET_NAME environment variable is required in production');
    }

    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await secretsClient.send(command);
    
    if (!response.SecretString) {
      throw new Error('No secret string found in the secret');
    }

    const secret = JSON.parse(response.SecretString);
    return {
      host: secret.host,
      port: Number(secret.port),
      user: secret.username,
      password: secret.password,
      database: secret.dbname || secret.database,
    };
  } catch (error) {
    console.error('Error fetching database credentials from Secrets Manager:', error);
    throw error;
  }
};

/**
 * Gets the database configuration based on environment
 */
const getDbConfig = async () => {
  if (dbConfig) {
    return dbConfig;
  }


  if (process.env.AWS_SAM_LOCAL !== 'true') {
    console.log('Using AWS Secrets Manager for database configuration');
    // Use AWS Secrets Manager in production
    const credentials = await getDbCredentialsFromSecrets();
    dbConfig = {
      ...credentials,
      // Lambda-specific pool settings
      max: 1, // Only allow 1 connection in the pool for a single Lambda container
      idleTimeoutMillis: 10000, // Close idle clients after 10 seconds
      connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection could not be established
      ssl: { rejectUnauthorized: false }, // Required for RDS
    };
  } else {
    console.log('Using environment variables for database configuration');
    // Use environment variables for local development
    dbConfig = {
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
  }

  console.log('Database config:', { 
    host: dbConfig.host, 
    port: dbConfig.port, 
    user: dbConfig.user, 
    database: dbConfig.database 
  });

  return dbConfig;
};
/**
 * Returns a singleton instance of the PostgreSQL connection pool.
 * It creates the pool on the first call and reuses it for subsequent calls.
 * This is the core of the Lambda-Tuned Pool pattern.
 */
export const getPool = async () => {
  if (!pool) {
    console.log('No existing pool found. Creating new pool...');
    const config = await getDbConfig();
    pool = new Pool(config);
  }
  return pool;
};

/**
 * Synchronous wrapper for getPool to maintain backward compatibility
 * This should be used temporarily while migrating to the async version
 */
export const getPoolSync = () => {
  if (!pool) {
    throw new Error('Pool not initialized. Use getPool() instead.');
  }
  return pool;
};

// We keep the initialization logic separate. This should not be run by the Lambda function
// at runtime. It should be run as a separate migration/setup step during deployment.
export const initializePostgres = async () => {
  const config = await getDbConfig();
  const initPool = new Pool(config);
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
// const pool = await getPool();
// const result = await pool.query('SELECT NOW()');
