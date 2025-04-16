import express, { Express } from 'express';
import path from 'path';
import fs from 'fs';
import { log } from './utils';

/**
 * Setup static file serving for production/Docker environments
 * This completely bypasses Vite and serves static files directly
 */
export function setupStaticServer(app: Express): void {
  // Path to the static files (built by Vite)
  const distPath = path.resolve(process.cwd(), 'dist', 'public');
  log('Setting up static file server for production/Docker');
  log(`Static files will be served from: ${distPath}`);
  
  // Check if the directory exists
  if (fs.existsSync(distPath)) {
    // Serve static files from the dist/public directory
    app.use(express.static(distPath));
    log('Static file serving configured successfully');
    
    // Serve index.html for all non-API/non-static routes (SPA client-side routing)
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api') && !req.path.includes('.')) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  } else {
    log(`WARNING: The build directory (${distPath}) does not exist!`, 'error');
    log('Static files will not be served properly', 'error');
    
    // Create a simple HTML page for this error case
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.status(500).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Server Configuration Error</title>
              <style>
                body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
                .error { color: #cc0000; background: #ffeeee; padding: 1rem; border-radius: 4px; }
              </style>
            </head>
            <body>
              <h1>Server Configuration Error</h1>
              <div class="error">
                <p>The application's static files directory couldn't be found.</p>
                <p>This typically happens when the frontend hasn't been built correctly or the build files weren't copied to the container.</p>
              </div>
              <h2>API Endpoints</h2>
              <p>API endpoints should still be accessible at <code>/api/*</code> paths.</p>
            </body>
          </html>
        `);
      }
    });
  }
}