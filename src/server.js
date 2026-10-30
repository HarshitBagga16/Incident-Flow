
import "dotenv/config";

import { validateEnv } from "./config/validateEnv.js";
import app from "./app.js";
import sequelize from "./config/database.js";

const PORT = Number(process.env.PORT || 3001);

let server;

async function startServer() {
  try {
    // 1. Validate environment variables
    validateEnv();

    // 2. Connect to database
    await sequelize.authenticate();

    console.log("Database connection established successfully.");

    // 3. Start HTTP server
    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully...`);

  try {
    // Stop accepting new HTTP requests
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }

    // Close database connection
    await sequelize.close();

    console.log("Server shut down successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error.message);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startServer();
