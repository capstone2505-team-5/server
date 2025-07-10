import app from "./app";
import config from "./config/config";
import { initializePostgres } from "./db/postgres";

async function startServer() {
  await initializePostgres();

  // Then start listening for requests
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});