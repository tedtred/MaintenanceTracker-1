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
    
    // Handle different paths in Docker vs other production environments
    let distPath = '';
    
    if (isDocker) {
      // In Docker, check multiple potential locations
      const possiblePaths = [
        path.resolve('/app', 'dist', 'public'),
        path.resolve(process.cwd(), 'dist', 'public'),
        path.resolve('/app', 'public'),
        path.resolve(process.cwd(), 'public'),
      ];
      
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          distPath = testPath;
          console.log(`Found static files in Docker at: ${distPath}`);
          break;
        }
      }
      
      if (!distPath) {
        // If not found, use a default and create it
        distPath = path.resolve(process.cwd(), 'dist', 'public');
        console.log(`No static files found. Using default path: ${distPath}`);
        try {
          fs.mkdirSync(distPath, { recursive: true });
          console.log(`Created directory ${distPath}`);
        } catch (err) {
          console.warn(`Couldn't create ${distPath}, will continue anyway:`, err);
        }
      }
    } else {
      // Non-Docker production
      distPath = path.resolve(process.cwd(), "dist", "public");
    }
    
    console.log("Serving static files from:", distPath);
    
    // Create a simple index.html if it doesn't exist
    const indexPath = path.join(distPath, "index.html");
    if (!fs.existsSync(indexPath)) {
      console.log(`Index file ${indexPath} not found, creating a placeholder.`);
      try {
        const placeholderHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CMMS API Server</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
    h1 { color: #333; }
    .api-section { background: #f8f8f8; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; }
    code { background: #e0e0e0; padding: 0.2rem 0.4rem; border-radius: 0.25rem; }
  </style>
</head>
<body>
  <h1>CMMS API Server</h1>
  <p>This is the API server for the Computerized Maintenance Management System (CMMS).</p>
  <p>The API is available at <code>/api</code> endpoints.</p>
  
  <div class="api-section">
    <h2>API Health Check</h2>
    <p>To verify the API is running: <code>GET /api/health</code></p>
  </div>
  
  <div class="api-section">
    <h2>API Documentation</h2>
    <p>Common endpoints include:</p>
    <ul>
      <li><code>GET /api/assets</code> - List all assets</li>
      <li><code>GET /api/work-orders</code> - List all work orders</li>
      <li><code>GET /api/maintenance-schedules</code> - List all maintenance schedules</li>
    </ul>
  </div>
</body>
</html>`;
        fs.writeFileSync(indexPath, placeholderHtml);
        console.log("Created placeholder index.html");
      } catch (err) {
        console.warn("Couldn't create placeholder index.html, but will continue:", err);
      }
    }

    // Only serve static files if the directory exists
    if (fs.existsSync(distPath)) {
      console.log("Serving static files");
      app.use(express.static(distPath));

      // Serve index.html for all non-API routes in production
      if (fs.existsSync(indexPath)) {
        app.get("*", (req, res, next) => {
          if (!req.path.startsWith("/api")) {
            console.log(`Serving index.html for path: ${req.path}`);
            res.sendFile(indexPath);
          } else {
            next();
          }
        });
      } else {
        console.warn("Index.html not found, only API routes will work");
      }
    } else {
      console.warn("Static files directory not found, only API routes will work");
    }

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
    
    // In development, import and setup Vite dynamically (but only if not Docker)
    if (!isDocker) {
      try {
        console.log("Loading development server (Vite)...");
        // @ts-ignore - Dynamic import
        const viteModule = await import("./dev-server.js");
        await viteModule.setupDevServer(app, server);
      } catch (error) {
        console.error("Failed to setup development server:", error);
        // Only exit in development if Vite is required
        process.exit(1);
      }
    } else {
      console.log("Skipping Vite setup in Docker environment");
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