/**
 * Pre-compiled production server for Docker environments
 * Plain JavaScript version to avoid TypeScript compilation issues
 */

const express = require("express");
const session = require("express-session");
const cors = require("cors");
const http = require("http");
const { createServer } = http;
const path = require("path");
const { storage } = require("./server/storage");

// Helper function for logging
function log(message, source = "express") {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${timestamp} [${source}] ${message}`);
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
  require("./server/auth").setupAuth(app);

  // Register all API routes
  await require("./server/routes").registerRoutes(app);

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
    
    res.sendFile(path.join(distPath, 'index.html'));
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