import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import path from "path";
import fs from "fs";
import { log, isProduction } from "./utils";

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
    console.log("Running in development mode");
    // In development, import and setup Vite dynamically
    try {
      // @ts-ignore - Dynamic import
      const viteModule = await import("./dev-server.js");
      await viteModule.setupDevServer(app, server);
    } catch (error) {
      console.error("Failed to setup development server:", error);
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