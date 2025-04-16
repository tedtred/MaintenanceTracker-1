/**
 * This script adds missing columns to the Docker environment database schema
 */

import pg from 'pg';
const { Pool } = pg;

async function main() {
  // Connect to the database using the DATABASE_URL environment variable
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Map of tables and their required columns with default values
    const requiredColumns = {
      problem_buttons: {
        'skip_details_form': 'BOOLEAN NOT NULL DEFAULT FALSE',
        'notify_maintenance': 'BOOLEAN NOT NULL DEFAULT FALSE',
        'work_order_title': 'TEXT',
        'work_order_description': 'TEXT',
        'work_order_priority': 'TEXT',
        'default_asset_id': 'INTEGER',
        'default_assigned_to': 'INTEGER',
        'order': 'INTEGER NOT NULL DEFAULT 0',
        'field_name': 'TEXT',
        'creates_work_order': 'BOOLEAN NOT NULL DEFAULT TRUE',
      },
      settings: {
        'work_week_start': 'TEXT NOT NULL DEFAULT \'SUNDAY\'',
      }
    };

    // Process each table and its columns
    for (const [tableName, columnDefinitions] of Object.entries(requiredColumns)) {
      console.log(`Checking ${tableName} table structure...`);
      
      // Get existing columns for the table
      const columnsResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}'
      `);
      
      const existingColumns = columnsResult.rows.map(row => row.column_name);
      console.log(`Current columns in ${tableName}:`, existingColumns);
      
      // Add missing columns
      for (const [columnName, columnDefinition] of Object.entries(columnDefinitions)) {
        // Handle special case for "order" which is a reserved keyword
        const quotedColumnName = columnName === 'order' ? '"order"' : columnName;
        
        if (!existingColumns.includes(columnName)) {
          console.log(`Adding ${columnName} column to ${tableName} table...`);
          await pool.query(`
            ALTER TABLE ${tableName} 
            ADD COLUMN ${quotedColumnName} ${columnDefinition}
          `);
          console.log(`${columnName} column added successfully`);
        } else {
          console.log(`${columnName} column already exists in ${tableName}`);
        }
      }
      
      // Verify the updated structure
      const verifyResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}'
      `);
      
      console.log(`Updated columns in ${tableName}:`, verifyResult.rows.map(row => row.column_name));
    }
    
    // Fix "create_work_order" vs "creates_work_order" discrepancy if needed
    const problemButtonsColumnsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'problem_buttons'
    `);
    
    const buttonColumns = problemButtonsColumnsCheck.rows.map(row => row.column_name);
    
    // If both columns exist, migrate data from old to new and drop the old one
    if (buttonColumns.includes('create_work_order') && buttonColumns.includes('creates_work_order')) {
      console.log('Both create_work_order and creates_work_order exist. Migrating data...');
      await pool.query(`
        UPDATE problem_buttons 
        SET creates_work_order = create_work_order 
        WHERE creates_work_order IS NULL
      `);
      
      console.log('Dropping old create_work_order column...');
      await pool.query(`
        ALTER TABLE problem_buttons 
        DROP COLUMN create_work_order
      `);
    } 
    // If only the old column exists, rename it to the new one
    else if (buttonColumns.includes('create_work_order') && !buttonColumns.includes('creates_work_order')) {
      console.log('Renaming create_work_order to creates_work_order...');
      await pool.query(`
        ALTER TABLE problem_buttons 
        RENAME COLUMN create_work_order TO creates_work_order
      `);
    }
    
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