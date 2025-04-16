/**
 * Pre-compiled production server for Docker environments
 * CommonJS version to avoid ES module issues
 */

const express = require("express");
const session = require("express-session");
const cors = require("cors");
const http = require("http");
const { createServer } = http;
const path = require("path");
const fs = require("fs");

// Helper function for logging
function log(message, source = "express") {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${timestamp} [${source}] ${message}`);
}

// Wait for modules to be available
async function waitForModules() {
  log("Checking if server modules are available...", "server");
  
  const modules = [
    {name: "storage", path: "./server/storage", export: "storage"},
    {name: "auth", path: "./server/auth", export: "setupAuth"},
    {name: "routes", path: "./server/routes", export: "registerRoutes"}
  ];
  
  const loadedModules = {};
  const maxAttempts = 10;
  
  for (const moduleInfo of modules) {
    let attempts = 0;
    log(`Trying to load ${moduleInfo.name} module...`, "server");
    
    while (attempts < maxAttempts) {
      try {
        // Try to require the module
        const module = require(moduleInfo.path);
        log(`${moduleInfo.name} module loaded successfully`, "server");
        
        // Check if the expected export exists
        if (module[moduleInfo.export]) {
          loadedModules[moduleInfo.name] = module[moduleInfo.export];
          break;
        } else {
          throw new Error(`Module loaded but ${moduleInfo.export} export not found`);
        }
      } catch (error) {
        attempts++;
        log(`Failed to load ${moduleInfo.name} module (attempt ${attempts}/${maxAttempts}): ${error.message}`, "server");
        
        // Wait before trying again
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (attempts >= maxAttempts) {
          throw new Error(`Failed to load ${moduleInfo.name} module after multiple attempts`);
        }
      }
    }
  }
  
  return loadedModules;
}

async function startProductionServer() {
  log('Running in production mode');
  
  // Check if this is a Docker environment
  const isDocker = process.env.IS_DOCKER === 'true' || 
                   process.env.DOCKER_ENV === 'true' || 
                   process.env.RUNNING_IN_DOCKER === 'true';
  
  if (isDocker) {
    log('Docker environment detected', 'server');
  }
  
  // Wait for all modules to be available
  const modules = await waitForModules();
  
  const app = express();
  const server = createServer(app);

  // Set up express middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors({
    origin: process.env.ALLOW_ORIGIN || '*',
    credentials: true
  }));

  // Set up session middleware
  app.use(
    session({
      store: modules.storage.sessionStore,
      secret: process.env.SESSION_SECRET || "secret-session-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24, // 1 day
      },
    })
  );

  // Set up authentication using our loaded module
  modules.auth(app);

  // Register all API routes using our loaded module
  await modules.routes(app);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Set up error handling middleware
  app.use((err, _req, res, _next) => {
    console.error(err.stack);
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal server error";
    res.status(statusCode).json({ message });
  });

  // Serve static files in production
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  
  // Serve index.html for any other route to support client-side routing
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API endpoint not found' });
    }
    
    const indexPath = path.join(distPath, 'index.html');
    
    // Check if the file exists before sending
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Application not properly built. Index file missing.');
    }
  });

  // Start the server
  const port = process.env.PORT || 5000;
  const host = process.env.HOST || "0.0.0.0";
  
  server.listen(port, host, () => {
    log(`Server started successfully and is serving on port ${port}`);
  });

  return server;
}

// Start the server
startProductionServer().catch((err) => {
  console.error("Error starting server:", err);
  process.exit(1);
});