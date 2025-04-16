/**
 * Docker-compatible storage implementation
 * 
 * Simplified version for Docker deployment that uses CommonJS
 */

const { Pool } = require('pg');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Basic PostgreSQL-based session store
const sessionStore = new pgSession({
  pool,
  tableName: 'session'
});

// Simple user operations
async function getUser(id) {
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0];
}

async function getUserByUsername(username) {
  const result = await pool.query(
    'SELECT * FROM users WHERE username = $1',
    [username]
  );
  return result.rows[0];
}

// Minimal storage implementation
class DockerStorage {
  constructor() {
    this.sessionStore = sessionStore;
  }
  
  // User operations
  async getUser(id) {
    return getUser(id);
  }
  
  async getUserByUsername(username) {
    return getUserByUsername(username);
  }
  
  // Add more methods as needed for the Docker version
}

// Export a singleton storage instance
const storage = new DockerStorage();
module.exports = { storage, pool };