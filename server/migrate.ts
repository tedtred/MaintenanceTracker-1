
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pkg from 'pg';
const { Pool } = pkg;
import crypto from "crypto";
import * as schema from "../shared/schema";

// Function to run migrations
export async function runMigrations() {
  console.log("Running database migrations...");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Create PostgreSQL connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Connection retry options
    max: 1,
    connectionTimeoutMillis: 10000
  });

  try {
    // Test the connection
    const client = await pool.connect();
    client.release();
    console.log("Successfully connected to database");

    // Create drizzle instance
    const db = drizzle(pool, { schema });

    // Add Asset_NO column if it doesn't exist
    await db.execute(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'assets' AND column_name = 'asset_no'
        ) THEN
          ALTER TABLE assets ADD COLUMN Asset_NO TEXT;
          -- Update existing rows with a default value
          UPDATE assets SET Asset_NO = 'A-' || id::text;
          -- Make the column not null after setting default values
          ALTER TABLE assets ALTER COLUMN Asset_NO SET NOT NULL;
        END IF;
      END $$;
    `);

    // Run base schema migrations
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        approved BOOLEAN NOT NULL DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS work_orders (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        assigned_to INTEGER REFERENCES users(id),
        asset_id INTEGER,
        reported_date TIMESTAMP NOT NULL DEFAULT NOW(),
        completed_date TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        location TEXT NOT NULL,
        status TEXT NOT NULL,
        category TEXT NOT NULL,
        model_number TEXT,
        serial_number TEXT,
        manufacturer TEXT,
        commissioned_date TIMESTAMP,
        last_maintenance TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS work_order_attachments (
        id SERIAL PRIMARY KEY,
        work_order_id INTEGER REFERENCES work_orders(id) NOT NULL,
        file_name TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_type TEXT NOT NULL,
        uploaded_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS maintenance_schedules (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        asset_id INTEGER REFERENCES assets(id) NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP,
        frequency TEXT NOT NULL,
        last_completed TIMESTAMP,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS maintenance_completions (
        id SERIAL PRIMARY KEY,
        schedule_id INTEGER REFERENCES maintenance_schedules(id) NOT NULL,
        completed_date TIMESTAMP NOT NULL,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        work_week_start INTEGER NOT NULL DEFAULT 1,
        work_week_end INTEGER NOT NULL DEFAULT 5,
        work_day_start TEXT NOT NULL DEFAULT '09:00',
        work_day_end TEXT NOT NULL DEFAULT '17:00',
        time_zone TEXT NOT NULL DEFAULT 'UTC',
        date_format TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
        time_format TEXT NOT NULL DEFAULT 'HH:mm',
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Add foreign key constraints
    await db.execute(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'work_orders_asset_id_fkey'
        ) THEN
          ALTER TABLE work_orders ADD CONSTRAINT work_orders_asset_id_fkey
          FOREIGN KEY (asset_id) REFERENCES assets(id);
        END IF;
      END $$;
    `);

    console.log("Database migration completed successfully");

    // Create default admin user if none exists
    console.log("Checking for existing admin user...");
    const adminCheck = await db.execute(`
      SELECT COUNT(*) FROM users WHERE role = 'ADMIN'
    `);

    const adminCount = parseInt(adminCheck.rows[0].count);

    if (adminCount === 0) {
      console.log("Creating default admin user...");
      // Create a default admin with username 'admin' and password 'admin123'
      // Password will be hashed properly
      const salt = crypto.randomBytes(16).toString('hex');
      const hashedPassword = crypto.scryptSync('admin123', salt, 64).toString('hex') + '.' + salt;

      await pool.query(`
        INSERT INTO users (username, password, role, approved)
        VALUES ('admin', $1, 'ADMIN', true)
      `, [hashedPassword]);

      console.log("Default admin user created. Username: admin, Password: admin123");
      console.log("IMPORTANT: Change this password immediately after first login!");
    } else {
      console.log("Admin user already exists, skipping default admin creation");
    }

  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  } finally {
    // Close the pool
    await pool.end();
  }
}

// If this module is run directly
if (import.meta.url === new URL(import.meta.url).href) {
  runMigrations()
    .then(() => {
      console.log("Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
