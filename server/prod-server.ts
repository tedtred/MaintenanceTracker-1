
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import path from "path";
import fs from "fs";

function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

async function startProductionServer() {
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

  const server = await registerRoutes(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    console.error("Error:", err); // Log the full error
  });

  // Serve static files
  // In Docker, the Vite output will be in /app/dist/public
  // In Replit/development, it will be in ./dist/public
  const isDocker = !!process.env.IS_DOCKER || !!process.env.DOCKER_ENV || !!process.env.RUNNING_IN_DOCKER;
  
  // Use correct path based on environment
  let distPath = '';
  if (isDocker) {
    distPath = path.resolve("/app", "dist", "public");
    console.log("Docker environment detected, serving static files from:", distPath);
  } else {
    distPath = path.resolve(process.cwd(), "dist", "public");
    console.log("Non-Docker environment detected, serving static files from:", distPath);
  }

  // Check if the dist directory exists
  if (!fs.existsSync(distPath)) {
    console.error(`Error: Build directory ${distPath} does not exist!`);
    console.log("Current working directory:", process.cwd());
    // Try to find where the files might be
    const potentialDirs = [
      path.join(process.cwd(), "dist"),
      path.join(process.cwd(), "public"),
      path.join(process.cwd(), "client", "dist"),
      "/app/dist",
      "/app/public"
    ];
    
    console.log("Searching for static files in alternative locations...");
    for (const dir of potentialDirs) {
      if (fs.existsSync(dir)) {
        console.log(`Found potential static files directory: ${dir}`);
        // If we found a directory, let's use it
        distPath = dir;
        break;
      }
    }
    
    // If we still don't have a valid directory, warn but continue
    if (!fs.existsSync(distPath)) {
      console.warn(`Warning: Could not find static files directory. Will attempt to continue.`);
    }
  }

  // Check if index.html exists
  const indexPath = path.join(distPath, "index.html");
  if (!fs.existsSync(indexPath)) {
    console.warn(`Warning: ${indexPath} does not exist! Will only serve API routes.`);
  }

  // Only serve static files if the directory exists
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));

    // Serve index.html for all non-API routes if it exists
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      app.get("*", (req, res) => {
        if (!req.path.startsWith("/api")) {
          console.log(`Serving index.html for path: ${req.path}`);
          res.sendFile(indexPath);
        }
      });
    } else {
      console.warn("No index.html found, only API routes will be available");
    }
  } else {
    console.warn("No static files directory found, only API routes will be available");
  }

  // ALWAYS serve on port 5000
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`Server started successfully and is serving on port ${port}`);
  });
}

startProductionServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
