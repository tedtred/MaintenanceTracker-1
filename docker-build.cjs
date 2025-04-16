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