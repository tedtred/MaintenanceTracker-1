/**
 * Production-specific entry point for Docker
 * Excludes Vite dependencies which cause issues in Docker
 */

import express from "express";
import session from "express-session";
import cors from "cors";
import { createServer } from "http";
import { storage } from "./storage.js";
import { registerRoutes } from "./routes.js";
import { setupAuth } from "./auth.js";
import { serveStatic } from "./vite.js";
import { log } from "./utils.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if this is a Docker environment
const isDocker = process.env.IS_DOCKER === 'true' || process.env.DOCKER_ENV === 'true' || 
                process.env.RUNNING_IN_DOCKER === 'true';

async function startProductionServer() {
  log('Running in production mode');
  
  if (isDocker) {
    log('Docker environment detected', 'server');
  }
  
  const app = express();
  const server = createServer(app);

  // Set up express middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors());

  // Set up session middleware
  app.use(
    session({
      store: storage.sessionStore,
      secret: process.env.SESSION_SECRET || "secret-session-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24, // 1 day
      },
    })
  );

  // Set up authentication
  setupAuth(app);

  // Register all API routes
  await registerRoutes(app);

  // Set up error handling middleware
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err.stack);
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal server error";
    res.status(statusCode).json({ message });
  });

  // Serve static files in production
  serveStatic(app);

  // Start the server
  const port = process.env.PORT || 5000;
  const host = process.env.HOST || "0.0.0.0";
  
  server.listen(port, () => {
    log(`Server started successfully and is serving on port ${port}`);
  });

  return server;
}

// Start the server
startProductionServer().catch((err) => {
  console.error("Error starting server:", err);
  process.exit(1);
});