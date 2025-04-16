/**
 * This is a utility script to create a mock Vite module for the Docker production environment.
 * It prevents errors when trying to import Vite in a production environment where it's not needed.
 */

const fs = require('fs');
const path = require('path');

// Directories to create
const DIRECTORIES = [
  path.join('node_modules', '@vitejs'),
  path.join('node_modules', '@vitejs', 'plugin-react'),
  path.join('node_modules', 'vite')
];

// Files to create
const FILES = [
  {
    path: path.join('node_modules', '@vitejs', 'plugin-react', 'package.json'),
    content: `{
  "name": "@vitejs/plugin-react",
  "version": "0.0.0",
  "description": "Mock module for Docker production environment",
  "main": "index.js",
  "type": "module"
}`
  },
  {
    path: path.join('node_modules', '@vitejs', 'plugin-react', 'index.js'),
    content: `
// Mock implementation for Docker environment
export default function reactPlugin() {
  return {
    name: 'mock-react-plugin',
    // No-op implementation
  };
}
`
  },
  {
    path: path.join('node_modules', 'vite', 'package.json'),
    content: `{
  "name": "vite",
  "version": "0.0.0",
  "description": "Mock module for Docker production environment",
  "main": "index.js",
  "type": "module"
}`
  },
  {
    path: path.join('node_modules', 'vite', 'index.js'),
    content: `
// Mock implementation for Docker environment
export function createServer() {
  console.log('Mock Vite server called - doing nothing in production');
  return {
    middlewares: {
      use: () => {}
    },
    listen: () => {},
    config: {
      server: {},
      root: '/'
    }
  };
}

export default {
  createServer
};
`
  }
];

// Create directories
console.log('Creating mock Vite modules...');
DIRECTORIES.forEach(dir => {
  const fullPath = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    console.log(`Creating directory: ${fullPath}`);
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Create files
FILES.forEach(file => {
  const fullPath = path.resolve(process.cwd(), file.path);
  if (!fs.existsSync(fullPath)) {
    console.log(`Creating file: ${fullPath}`);
    fs.writeFileSync(fullPath, file.content);
  } else {
    console.log(`File already exists, overwriting: ${fullPath}`);
    fs.writeFileSync(fullPath, file.content);
  }
});

console.log('Mock Vite modules created successfully');