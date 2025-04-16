import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import path from "path";
import fs from "fs";
import { log, isProduction, isReplit, isDocker } from "./utils";
import { createServer } from 'http';

// Import migrations
import { runMigrations } from './migrate';


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

  // Check if this is a migrations-only run
  const runMigrationsOnly = process.argv.includes('--run-migrations');

  // Run migrations before server start
  try {
    console.log("Environment check:");
    console.log("  - Running in Replit:", isReplit);
    console.log("  - Production mode:", isProduction);
    console.log("  - FORCE_DB_REBUILD:", process.env.FORCE_DB_REBUILD);
    console.log("  - Migrations-only mode:", runMigrationsOnly);
    
    // Check for FORCE_DB_REBUILD environment variable
    // Allow rebuild when explicitly requested via CLI or env var
    // Never auto-rebuild in Replit unless explicitly running the script
    const forceRebuild = (!isReplit && process.env.FORCE_DB_REBUILD === 'true') || 
                         (runMigrationsOnly && process.argv.includes('--force'));
    
    if (forceRebuild) {
      console.log("⚠️ Database rebuild triggered!");
      if (isReplit) {
        console.log("Running in Replit - rebuild was explicitly requested via script.");
      } else if (isProduction) {
        console.log("Running in production Docker environment.");
      }
      
      await runMigrations(true);
      console.log("Database rebuilt successfully. Remember to set FORCE_DB_REBUILD=false for subsequent deployments.");
      
      // If this is a migrations-only run, exit after completion
      if (runMigrationsOnly) {
        console.log("Migrations completed, exiting...");
        process.exit(0);
      }
    } else if (isProduction || (runMigrationsOnly && !isReplit)) {
      // In production or when explicitly requested (but not in Replit), run migrations but don't force rebuild
      console.log("Running migrations without force rebuild (normal mode)");
      await runMigrations(false);
      
      // If this is a migrations-only run, exit after completion
      if (runMigrationsOnly) {
        console.log("Migrations completed, exiting...");
        process.exit(0);
      }
    } else if (isReplit && !runMigrationsOnly) {
      console.log("Skipping automatic migrations in Replit development environment");
    }
  } catch (error) {
    console.error("Failed to run migrations:", error);
    
    // If this is a migrations-only run, exit with error
    if (runMigrationsOnly) {
      process.exit(1);
    }
    // Continue anyway for normal server operation, as the tables might already exist
  }


  // Log Docker environment status
  console.log("Docker environment:", isDocker ? "Yes" : "No");
  
  // In production or Docker, serve static files first
  if (isProduction || isDocker) {
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
    console.log("- IS_DOCKER:", process.env.IS_DOCKER);
    console.log("- DOCKER_ENV:", process.env.DOCKER_ENV);
    console.log("- RUNNING_IN_DOCKER:", process.env.RUNNING_IN_DOCKER);
  } else {
    console.log("Running in development mode");
    if (isReplit) {
      console.log("Detected Replit environment");
    }
    
    // In development, import and setup Vite dynamically
    try {
      // Use dynamic import with explicit file path to avoid issues
      // @ts-ignore - Dynamic import
      const viteModule = await import("./dev-server.js");
      await viteModule.setupDevServer(app, server);
    } catch (error) {
      console.error("Failed to setup development server:", error);
      // Only exit in development if Vite is required
      process.exit(1);
    }
  }

  // ALWAYS serve on port 5000
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`Server started successfully and is serving on port ${port}`);
  });
})().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});