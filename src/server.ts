import app from "./app";
import config from "./config/config";
import { populateAllMockData } from "./db/populatedb";
import { initializePostgres } from "./db/postgres";
import { pool } from "./db/postgres";

async function startServer() {
  await initializePostgres();
  await populateAllMockData();
  // Then start listening for requests
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Closing DB pool...');
  await pool.end();
  console.log('DB pool closed. Exiting process.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing DB pool...');
  await pool.end();
  console.log('DB pool closed. Exiting process.');
  process.exit(0);
});