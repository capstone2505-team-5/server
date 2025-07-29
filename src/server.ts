import app from "./app";
import config from "./config/config";
import { populateAllMockData, populateRootSpansTable, populateProjectsTable } from "./db/populatedb";
import { initializePostgres } from "./db/postgres";
import { pool } from "./db/postgres";
import { fetchProjects } from './services/graphqlIngestion/fetchProjects';
import { tempProjectIdFiller } from './services/projectService';

async function startServer() {
  await initializePostgres();
  const projects = await fetchProjects();

  if (!projects) {
    console.log('no projects found');
  } else {
    await populateProjectsTable(projects);
  }

  //await populateAllMockData(); // DEV MODE - resets annotations and rootspans

  if(process.env.NODE_ENV === "development") {
    try {
      const response = await fetch('http://localhost:8080/fetchRootSpans');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }
      console.log("Successfully fetched root spans")
    } catch (err) {
      console.error(err);
      console.log('Error fetching root spans');
    }
  }
  
  await tempProjectIdFiller();
  
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