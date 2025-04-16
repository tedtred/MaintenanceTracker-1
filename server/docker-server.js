/**
 * Docker-specific entry point for the CMMS application
 * 
 * This file is a production-only entry point for the Docker environment.
 * It has ZERO dependencies on Vite or any other development tools.
 * This ensures we can run in production without dev dependencies.
 */

import path from 'path';
import fs from 'fs';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import { fileURLToPath } from 'url';

// Internal imports
import { storage } from './storage.js';
import { setupAuth } from './auth.js';
import { registerRoutes } from './routes.js';
import { runMigrations } from './migrate.js';
import { isDocker, log } from './utils.js';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check environment 
log(`Environment check:
  - Running in Docker: ${isDocker ? 'Yes' : 'No'}
  - Production mode: ${process.env.NODE_ENV === 'production' ? 'Yes' : 'No'}
  - FORCE_DB_REBUILD: ${process.env.FORCE_DB_REBUILD || 'undefined'}
  - Migrations-only mode: ${process.env.MIGRATIONS_ONLY === 'true' ? 'Yes' : 'No'}`);

if (!isDocker) {
  log('Error: This server file is only intended for Docker environments');
  process.exit(1);
}

// Run database migrations, with force rebuild if specified
const forceRebuild = process.env.FORCE_DB_REBUILD === 'true';
await runMigrations(forceRebuild);

// Exit if we're only running migrations
if (process.env.MIGRATIONS_ONLY === 'true') {
  log('Migrations completed. Exiting as MIGRATIONS_ONLY is set');
  process.exit(0);
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Basic Express security and utility middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up CORS
const allowedOrigins = process.env.ALLOW_ORIGIN ? 
  process.env.ALLOW_ORIGIN.split(',') : 
  ['http://localhost:5000', 'http://localhost:3000'];

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
    secure: process.env.NODE_ENV === 'production' && !isDocker,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

// Set up authentication
setupAuth(app);

// Register API routes
const server = await registerRoutes(app);

// Serve static files for production mode
const publicDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
  log(`Serving static files from ${publicDir}`);
  app.use(express.static(publicDir));
  
  // Serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) return next();
    
    const indexPath = path.join(publicDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      log(`Serving index.html for path: ${req.path}`);
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
}

// Error handling middleware must be defined last
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

// Start the server
server.listen(PORT, HOST, () => {
  log(`Server started successfully and is serving on port ${PORT}`);
});