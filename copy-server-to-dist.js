/**
 * This script copies the Docker-specific server files to the dist directory.
 * It's used during the Docker build process to ensure the production server
 * is available without relying on Vite or other development dependencies.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const sourceFile = path.join(__dirname, 'server', 'docker-server.js');
const targetDir = path.join(__dirname, 'dist');
const targetFile = path.join(targetDir, 'docker-server.js');

// Create dist directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  console.log(`Creating dist directory: ${targetDir}`);
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy the file
try {
  console.log(`Copying ${sourceFile} to ${targetFile}`);
  fs.copyFileSync(sourceFile, targetFile);
  console.log('File copied successfully');
} catch (error) {
  console.error('Error copying file:', error);
  process.exit(1);
}