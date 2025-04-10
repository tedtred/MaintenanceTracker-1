import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pkg from 'pg';
const { Pool } = pkg;
import crypto from "crypto"; // Import crypto at the top level
import readline from 'readline';

// Function to create a readline interface for user prompts
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// Function to prompt for user confirmation
function askForConfirmation(question) {
  const rl = createInterface();
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Function to run migrations
export async function runMigrations(forceRebuild = false) {
  console.log("Running database migrations...");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Check if we should reset the database (when not coming from automated process)
  const shouldPrompt = process.stdout.isTTY && !forceRebuild;
  let shouldResetDb = forceRebuild;

  if (shouldPrompt) {
    console.log("\n⚠️  DATABASE RESET PROMPT ⚠️");
    console.log("Would you like to reset the database? This will DELETE ALL DATA.");
    shouldResetDb = await askForConfirmation("Reset database? (y/N): ");
    
    if (shouldResetDb) {
      console.log("\n⚠️  FINAL WARNING ⚠️");
      console.log("This will PERMANENTLY DELETE ALL DATA in the database.");
      console.log("This action CANNOT be undone.");
      const finalConfirmation = await askForConfirmation("Are you ABSOLUTELY SURE you want to proceed? (y/N): ");
      
      if (!finalConfirmation) {
        console.log("Database reset cancelled.");
        shouldResetDb = false;
      }
    }
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

    // Force rebuild if requested and confirmed
    if (shouldResetDb) {
      console.log("🔄 Force rebuilding database...");
      await pool.query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
      console.log("✅ Database schema reset complete");
    }

    // Create drizzle instance
    const db = drizzle(pool);

    // Run SQL from schema
    console.log("Applying schema...");
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        approved BOOLEAN NOT NULL DEFAULT false,
        page_permissions TEXT NOT NULL DEFAULT '[]'
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
    `);

    // Add foreign key constraint for assets table in work_orders after both tables exist
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

    const adminCount = Number(adminCheck.rows[0].count);

    if (adminCount === 0) {
      console.log("Creating default admin user...");
      // Create a default admin with username 'admin' and password 'admin123'
      // Password will be hashed properly
      const salt = crypto.randomBytes(16).toString('hex');
      const hashedPassword = crypto.scryptSync('admin123', salt, 64).toString('hex') + '.' + salt;

      // Use direct SQL execution instead of parameterized query
      await pool.query(`
        INSERT INTO users (username, password, role, approved, page_permissions)
        VALUES ('admin', $1, 'ADMIN', true, '[]')
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
if (process.argv[1] === process.argv[2]) {
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