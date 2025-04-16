/**
 * Docker-specific routes implementation
 * 
 * This is a simplified version of routes.ts that works in CommonJS
 * to ensure compatibility with Docker environments
 */

const express = require('express');
const { storage } = require('./docker-storage');
const cors = require('cors');
const session = require('express-session');

// Simple health check endpoint
function setupHealthCheck(app) {
  app.get('/api/health', (req, res) => {
    const timestamp = new Date().toISOString();
    res.json({
      status: 'ok', 
      timestamp,
      environment: {
        node_env: process.env.NODE_ENV || 'unknown',
        running_in_docker: process.env.RUNNING_IN_DOCKER === 'true' ? true : false,
      }
    });
  });
}

// Initialize routes
async function registerRoutes(app) {
  // Enable CORS
  app.use(cors({
    origin: true,
    credentials: true
  }));
  
  // Setup session handling
  app.use(session({
    secret: process.env.SESSION_SECRET || 'default-secret-dont-use-in-prod',
    name: 'maintenancetracker.sid',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    },
    store: storage.sessionStore
  }));
  
  // Setup health check endpoint
  setupHealthCheck(app);

  // Add API routes
  // User routes
  app.get('/api/user', async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy();
        return res.status(401).json({ message: 'User not found' });
      }
      
      // Don't send the password hash
      delete user.password;
      res.json(user);
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // ... add more routes as needed for your Docker environment
  
  // Fallback for API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({ 
      message: 'API endpoint not found', 
      path: req.path,
      note: 'This is from the simplified Docker routes file. Some endpoints may not be implemented.'
    });
  });
  
  return app;
}

module.exports = { registerRoutes };