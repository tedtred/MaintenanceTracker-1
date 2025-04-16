#!/usr/bin/env node

/**
 * Special build script for Docker environment
 * This script creates a production-ready build without Vite references
 * for Node.js backend running in a Docker container
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Patching server code for Docker environment...');

// In Docker container at runtime, we don't want to rebuild
// We just want to patch the existing built files
if (process.env.IS_DOCKER || process.env.DOCKER_ENV || process.env.RUNNING_IN_DOCKER) {
  console.log('Detected Docker environment, skipping build and just patching files');
} else {
  // Step 1: Build the frontend with Vite
  console.log('Building frontend with Vite...');
  execSync('npx vite build', { stdio: 'inherit' });

  // Step 2: Build the backend without Vite imports
  console.log('Building backend for production...');
  execSync(
    'npx esbuild server/index.ts server/prod-server.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', 
    { stdio: 'inherit' }
  );
}

// Step 3: Patch the built server code to remove Vite imports
console.log('Patching built server code...');
try {
  const distDir = path.resolve(process.cwd(), 'dist');
  
  // Files to patch
  const filesToPatch = [
    path.join(distDir, 'index.js'),
    path.join(distDir, 'prod-server.js')
  ];
  
  // Ensure dist/public directory exists
  const publicDir = path.join(distDir, 'public');
  if (!fs.existsSync(publicDir)) {
    console.log(`Creating public directory: ${publicDir}`);
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  // Create an index.html file if it doesn't exist
  const indexPath = path.join(publicDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.log(`Creating placeholder index.html at ${indexPath}`);
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
  }
  
  // Patch each file
  filesToPatch.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Remove any import from vite
      content = content.replace(/import .* from ['"]vite['"]/g, '// Import removed for Docker');
      content = content.replace(/import .* from ['"]\.\/(dev-server|vite)['"]/g, '// Import removed for Docker');
      content = content.replace(/import .* from ['"].*\/dev-server['"]/g, '// Import removed for Docker');
      
      // Save the patched file
      fs.writeFileSync(filePath, content);
      console.log(`Patched ${filePath}`);
    } else {
      console.log(`File ${filePath} does not exist, skipping`);
    }
  });
  
  console.log('Patching completed successfully for Docker environment');
} catch (error) {
  console.error('Patching failed:', error);
  process.exit(1);
}