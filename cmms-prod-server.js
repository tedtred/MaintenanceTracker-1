/**
 * Super simple production server for CMMS in Docker environment.
 * This contains NO Vite dependencies and is a standalone server.
 */

import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';

// Get current filename and directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import internal modules - try with both relative and absolute paths
let storage, setupAuth, registerRoutes, runMigrations;

try {
  // First try to import from server directory
  const serverDir = path.join(__dirname, 'server');
  
  // Dynamic imports with error handling
  try {
    const storageModule = await import(path.join(serverDir, 'storage.js'));
    storage = storageModule.storage;
    
    const authModule = await import(path.join(serverDir, 'auth.js'));
    setupAuth = authModule.setupAuth;
    
    const routesModule = await import(path.join(serverDir, 'routes.js'));
    registerRoutes = routesModule.registerRoutes;
    
    const migrateModule = await import(path.join(serverDir, 'migrate.js'));
    runMigrations = migrateModule.runMigrations;
    
    console.log('Successfully imported modules from server directory');
  } catch (err) {
    console.error('Error importing from server directory:', err);
    
    // Try from dist directory as fallback
    const distDir = path.join(__dirname, 'dist');
    
    const storageModule = await import(path.join(distDir, 'storage.js'));
    storage = storageModule.storage;
    
    const authModule = await import(path.join(distDir, 'auth.js'));
    setupAuth = authModule.setupAuth;
    
    const routesModule = await import(path.join(distDir, 'routes.js'));
    registerRoutes = routesModule.registerRoutes;
    
    const migrateModule = await import(path.join(distDir, 'migrate.js'));
    runMigrations = migrateModule.runMigrations;
    
    console.log('Successfully imported modules from dist directory');
  }
} catch (error) {
  console.error('Fatal error importing required modules:', error);
  process.exit(1);
}

// Logger utility
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

// Main function
async function startServer() {
  const PORT = process.env.PORT || 5000;
  const HOST = process.env.HOST || '0.0.0.0';
  
  log(`Starting CMMS production server on ${HOST}:${PORT}`);
  log(`Environment: NODE_ENV=${process.env.NODE_ENV}`);
  log(`Docker: ${process.env.IS_DOCKER ? 'Yes' : 'No'}`);
  
  // Run database migrations if FORCE_DB_REBUILD is set
  const forceRebuild = process.env.FORCE_DB_REBUILD === 'true';
  if (forceRebuild) {
    log('Force rebuilding database schema');
    await runMigrations(forceRebuild);
  }
  
  // Create Express app
  const app = express();
  
  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Configure CORS
  const allowedOrigins = process.env.ALLOW_ORIGIN ? 
    process.env.ALLOW_ORIGIN.split(',') : 
    ['http://localhost:5000'];
  
  app.use(cors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    credentials: true
  }));
  
  // Session configuration
  const SESSION_SECRET = process.env.SESSION_SECRET || 'keyboard cat';
  app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production' && !process.env.IS_DOCKER,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  }));
  
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Setup authentication
  setupAuth(app);
  
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // Register API routes
  const server = await registerRoutes(app);
  
  // Serve static files from the 'public' directory if it exists
  const publicDir = path.join(__dirname, 'public');
  if (fs.existsSync(publicDir)) {
    log(`Serving static files from ${publicDir}`);
    app.use(express.static(publicDir));
  }
  
  // Fallback to dist/public if exists
  const distPublicDir = path.join(__dirname, 'dist', 'public');
  if (fs.existsSync(distPublicDir)) {
    log(`Serving static files from ${distPublicDir}`);
    app.use(express.static(distPublicDir));
  }
  
  // Serve index.html for non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    
    // Try different index.html locations
    const indexPaths = [
      path.join(publicDir, 'index.html'),
      path.join(distPublicDir, 'index.html')
    ];
    
    for (const indexPath of indexPaths) {
      if (fs.existsSync(indexPath)) {
        log(`Serving index.html from ${indexPath} for path: ${req.path}`);
        return res.sendFile(indexPath);
      }
    }
    
    // If no index.html found, send a basic HTML page
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>CMMS API Server</title>
      <style>
        body { font-family: -apple-system, system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
        code { background: #f0f0f0; padding: 2px 4px; border-radius: 3px; }
      </style>
    </head>
    <body>
      <h1>CMMS API Server</h1>
      <p>This server is running in production mode. The API is available at <code>/api</code> endpoints.</p>
      <p>Health check: <a href="/api/health">/api/health</a></p>
    </body>
    </html>
    `);
  });
  
  // Error handling middleware
  app.use((err, _req, res, _next) => {
    log(`Error: ${err.message}`, 'error');
    console.error(err);
    
    res.status(err.status || 500).json({
      error: {
        message: err.message || 'Internal Server Error',
        status: err.status || 500
      }
    });
  });
  
  // Start server
  server.listen(PORT, HOST, () => {
    log(`Server started successfully and is serving on ${HOST}:${PORT}`);
  });
  
  return server;
}

// Start the server
startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});