# LLMonade - Backend Server

This repository contains the backend API server for LLMonade, a full-stack AI evaluation tool. It exposes a RESTful API to access and manage trace evaluation data stored in PostgreSQL.

Note: This server does not handle initial data ingestion from Phoenix; a separate, decoupled data ingestion service populates the database. This service provides the API layer for the LLMonade web application.

## Environment variables (.env)

Copy `env.sample` to `.env` and adjust values for your local setup. The required keys:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=your-db-user-name
DB_PASSWORD=your-db-password
DB_NAME=error_analysis
OPENAI_API_KEY=your-open-ai-key-here
PHOENIX_API_URL=your-phoenix-end-point-here
NODE_ENV=development
```

## Run the App

1. Install dependencies

```bash
npm install
```

2. Build the project (run after source changes)

```bash
npm run build
```

3. Build AWS SAM artifacts (run after template or code changes)

```bash
sam build
```

4. Start the local Lambda emulator (Terminal 1)

```bash
sam local start-lambda
```

5. Start the local API Gateway emulator (Terminal 2)

```bash
sam local start-api
```

## Key Features

- Powerful data querying: filtering, sorting, and pagination for root spans
- Annotation management: CRUD for user annotations and ratings
- Batch-based workflows with async job support
- AI-powered categorization of annotation notes

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- Vitest
- AWS SAM

## Getting Started

- Install dependencies with `npm install`
- Configure your `.env` using the sample above
- Use the steps in "Run the App" to start local services

## Documentation

- API docs: see `api-docs.md`
- Tests: `npm test`

## Initialize the database schema (optional, local dev)

This project exports a helper `initializePostgres()` that creates the required tables. It is not called automatically. To run it manually without adding code files, you can execute it directly with `tsx`:

- One‑off run using local env vars from `.env` (dotenv is already loaded by the module):

```bash
npx tsx -e "import('./src/db/postgres.ts').then(m=>m.initializePostgres()).then(()=>console.log('Initialized')).catch(e=>{console.error(e);process.exit(1);})"
```

- If you want to run it using AWS Secrets Manager (not local `.env`), ensure the following env vars are set in your shell before running the same command:

```bash
export AWS_REGION=us-east-1
export RDS_CREDENTIALS_SECRET_NAME=your-secret-name
unset AWS_SAM_LOCAL
npx tsx -e "import('./src/db/postgres.ts').then(m=>m.initializePostgres()).then(()=>console.log('Initialized')).catch(e=>{console.error(e);process.exit(1);})"
```

Notes:
- When `AWS_SAM_LOCAL` is set to `true`, the code uses local env vars for DB connection.
- When `AWS_SAM_LOCAL` is not `true`, it fetches DB credentials from AWS Secrets Manager.