
import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/pg-core';
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

// Create the appropriate pool based on environment
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Use the appropriate ORM client
export const db = drizzle(pool, { schema });
