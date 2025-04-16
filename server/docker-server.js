/**
 * Production/Docker-only server entry point
 * 
 * This file is deliberately in JavaScript (not TypeScript) and uses CommonJS
 * to completely avoid any issues with ESM imports or TypeScript compilation
 * in the Docker environment.
 */

// Standard node.js modules
const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Create Express application
const app = express();
const server = http.createServer(app);

// Use JSON and URL-encoded parsers
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`${new Date().toISOString()} - Received ${req.method} ${req.url}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} - Completed ${req.method} ${req.url} with status ${res.statusCode} in ${duration}ms`);
  });
  
  next();
});

// Serve static files from the public directory
const staticPath = path.join(__dirname, '..', 'dist', 'public');
console.log(`Serving static files from ${staticPath}`);

if (fs.existsSync(staticPath)) {
  app.use(express.static(staticPath));
  console.log('Static file serving configured successfully');
  
  // Serve index.html for all non-API routes (client-side routing)
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(staticPath, 'index.html'));
    }
  });
} else {
  console.warn(`Warning: Static files directory ${staticPath} does not exist`);
}

// Define port (always 5000 for Docker)
const port = 5000;

// Setup API routes
try {
  // We'll load routes from our Docker-specific routes file
  const setupRoutes = require('./docker-routes.js').registerRoutes;
  setupRoutes(app).then(() => {
    console.log('API routes registered successfully');
    
    // Start server after routes are registered
    server.listen(port, '0.0.0.0', () => {
      console.log(`Docker production server running on port ${port}`);
    });
  }).catch(err => {
    console.error('Failed to register routes:', err);
    process.exit(1);
  });
} catch (error) {
  console.error('Critical error setting up server:', error);
  process.exit(1);
}