
import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import { neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Check if we're in Docker environment
const isDockerEnvironment = process.env.NODE_ENV === 'production';

// Only use Neon DB with WebSockets outside Docker
if (!isDockerEnvironment) {
  // For development environment (using Neon with WebSockets)
  neonConfig.webSocketConstructor = ws;
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("[Debug] Creating database pool with configuration");
console.log("[Debug] Using Docker environment:", isDockerEnvironment);
console.log("[Debug] Using WebSocket connection:", !isDockerEnvironment);

// Create the appropriate pool based on environment
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Add event listeners to pool for debugging
pool.on('connect', () => {
  console.log('[Debug] New client connected to pool');
});

pool.on('error', (err) => {
  console.error('[Debug] Unexpected error on idle client', err);
});

pool.on('acquire', () => {
  console.log('[Debug] Client acquired from pool');
  console.log('[Debug] Pool stats - Total:', pool.totalCount, 'Idle:', pool.idleCount, 'Waiting:', pool.waitingCount);
});

pool.on('remove', () => {
  console.log('[Debug] Client removed from pool');
});

// Use the appropriate ORM client
console.log("[Debug] Initializing Drizzle ORM");
export const db = drizzle(pool, { schema });
console.log("[Debug] Database setup complete");
