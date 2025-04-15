/**
 * This script adds missing columns to the Docker environment database schema
 */

const { Pool } = require('pg');

async function main() {
  // Connect to the database using the DATABASE_URL environment variable
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Checking problem_buttons table structure...');
    
    // Check if skip_details_form column exists
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'problem_buttons'
    `);
    
    const columns = columnsResult.rows.map(row => row.column_name);
    console.log('Current columns:', columns);
    
    // Add skip_details_form column if it doesn't exist
    if (!columns.includes('skip_details_form')) {
      console.log('Adding skip_details_form column to problem_buttons table...');
      await pool.query(`
        ALTER TABLE problem_buttons 
        ADD COLUMN skip_details_form BOOLEAN NOT NULL DEFAULT FALSE
      `);
      console.log('skip_details_form column added successfully');
    } else {
      console.log('skip_details_form column already exists');
    }
    
    // Add notify_maintenance column if it doesn't exist
    if (!columns.includes('notify_maintenance')) {
      console.log('Adding notify_maintenance column to problem_buttons table...');
      await pool.query(`
        ALTER TABLE problem_buttons 
        ADD COLUMN notify_maintenance BOOLEAN NOT NULL DEFAULT FALSE
      `);
      console.log('notify_maintenance column added successfully');
    } else {
      console.log('notify_maintenance column already exists');
    }
    
    // Add work_order_title column if it doesn't exist
    if (!columns.includes('work_order_title')) {
      console.log('Adding work_order_title column to problem_buttons table...');
      await pool.query(`
        ALTER TABLE problem_buttons 
        ADD COLUMN work_order_title TEXT
      `);
      console.log('work_order_title column added successfully');
    } else {
      console.log('work_order_title column already exists');
    }
    
    // Add work_order_description column if it doesn't exist
    if (!columns.includes('work_order_description')) {
      console.log('Adding work_order_description column to problem_buttons table...');
      await pool.query(`
        ALTER TABLE problem_buttons 
        ADD COLUMN work_order_description TEXT
      `);
      console.log('work_order_description column added successfully');
    } else {
      console.log('work_order_description column already exists');
    }
    
    // Add work_order_priority column if it doesn't exist
    if (!columns.includes('work_order_priority')) {
      console.log('Adding work_order_priority column to problem_buttons table...');
      await pool.query(`
        ALTER TABLE problem_buttons 
        ADD COLUMN work_order_priority TEXT
      `);
      console.log('work_order_priority column added successfully');
    } else {
      console.log('work_order_priority column already exists');
    }
    
    // Add default_asset_id column if it doesn't exist
    if (!columns.includes('default_asset_id')) {
      console.log('Adding default_asset_id column to problem_buttons table...');
      await pool.query(`
        ALTER TABLE problem_buttons 
        ADD COLUMN default_asset_id INTEGER
      `);
      console.log('default_asset_id column added successfully');
    } else {
      console.log('default_asset_id column already exists');
    }
    
    // Add default_assigned_to column if it doesn't exist
    if (!columns.includes('default_assigned_to')) {
      console.log('Adding default_assigned_to column to problem_buttons table...');
      await pool.query(`
        ALTER TABLE problem_buttons 
        ADD COLUMN default_assigned_to INTEGER
      `);
      console.log('default_assigned_to column added successfully');
    } else {
      console.log('default_assigned_to column already exists');
    }
    
    // Check if order column exists
    if (!columns.includes('order')) {
      console.log('Adding order column to problem_buttons table...');
      await pool.query(`
        ALTER TABLE problem_buttons 
        ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0
      `);
      console.log('order column added successfully');
    } else {
      console.log('order column already exists');
    }
    
    // Verify the updated structure
    const verifyResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'problem_buttons'
    `);
    
    console.log('Updated columns:', verifyResult.rows.map(row => row.column_name));
    
    console.log('Database schema update completed successfully');
  } catch (error) {
    console.error('Error updating database schema:', error);
  } finally {
    // Close the connection
    await pool.end();
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});