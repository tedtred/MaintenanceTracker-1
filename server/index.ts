import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import path from "path";
import fs from "fs";
import { log, isProduction } from "./utils";
import { createServer } from 'http'; // Added createServer import

// Import migrations - Added this line
import { runMigrations } from './migrate.js';


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    console.error("Error:", err); // Log the full error
  });

  // Run migrations before server start in production - Added this block
  if (isProduction) {
    try {
      console.log("[Debug] Starting migrations in production mode");
      await runMigrations();
      console.log("[Debug] Migrations completed successfully in production");
    } catch (error) {
      console.error("Failed to run migrations:", error);
      // Continue anyway, as the tables might already exist
    }
  }

  console.log("[Debug] Proceeding with server setup");


  // In production, serve static files first
  if (isProduction) {
    console.log("Running in production mode");
    const distPath = path.resolve(process.cwd(), "dist", "public");
    console.log("Serving static files from:", distPath);

    // Check if the dist directory exists
    if (!fs.existsSync(distPath)) {
      console.error(`Error: Build directory ${distPath} does not exist!`);
      process.exit(1);
    }

    // Check if index.html exists
    const indexPath = path.join(distPath, "index.html");
    if (!fs.existsSync(indexPath)) {
      console.error(`Error: ${indexPath} does not exist!`);
      process.exit(1);
    }

    console.log("Found required static files");

    app.use(express.static(distPath));

    // Serve index.html for all non-API routes in production
    app.get("*", (req, res, next) => {
      if (!req.path.startsWith("/api")) {
        console.log(`Serving index.html for path: ${req.path}`);
        res.sendFile(path.join(distPath, "index.html"));
      } else {
        next();
      }
    });

    // Log environment configuration
    console.log("Environment Configuration:");
    console.log("- NODE_ENV:", process.env.NODE_ENV);
    console.log("- PORT:", process.env.PORT);
    console.log("- HOST:", process.env.HOST);
    console.log("- DATABASE_URL exists:", !!process.env.DATABASE_URL);
  } else {
    console.log("[Debug] Running in development mode");
    console.log("[Debug] Attempting to setup Vite development server");
    // In development, import and setup Vite dynamically
    try {
      // Use dynamic import with explicit file path to avoid issues
      // @ts-ignore - Dynamic import
      console.log("[Debug] Importing dev-server module");
      const viteModule = await import("./dev-server.js");
      await viteModule.setupDevServer(app, server);
    } catch (error) {
      console.error("Failed to setup development server:", error);
      if (isProduction) {
        // In production, continue without Vite if there's an error
        console.log("Continuing without development server in production mode");
      } else {
        // Only exit in development if Vite is required
        process.exit(1);
      }
    }
  }

  // ALWAYS serve on port 5000
  const port = 5000;
  console.log("[Debug] Attempting to start server on port", port);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`Server started successfully and is serving on port ${port}`);
    console.log("[Debug] Server is now listening for requests");
  });
})().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});