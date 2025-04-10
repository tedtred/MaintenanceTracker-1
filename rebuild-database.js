#!/usr/bin/env node

/**
 * This script will force a full database rebuild by setting the 
 * FORCE_DB_REBUILD environment variable to "true" temporarily.
 * 
 * Usage:
 * node rebuild-database.js
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('⚠️  WARNING: This will COMPLETELY ERASE your database and rebuild it from scratch ⚠️');
  console.log('All existing data will be lost and only the default admin user will be recreated.');
  console.log('');
  
  const answer1 = await askQuestion('Are you sure you want to continue? (yes/no): ');
  
  if (answer1.toLowerCase() !== 'yes' && answer1.toLowerCase() !== 'y') {
    console.log('Database rebuild cancelled.');
    rl.close();
    return;
  }
  
  console.log('\n⚠️  FINAL WARNING: You are about to DESTROY ALL DATA in the database! ⚠️');
  const answer2 = await askQuestion('Type "REBUILD" to confirm: ');
  
  if (answer2 !== 'REBUILD') {
    console.log('Database rebuild cancelled.');
    rl.close();
    return;
  }
  
  console.log('\nProceeding with database rebuild...');
  
  try {
    // Set the environment variable and run the server just long enough to rebuild the database
    console.log('Rebuilding database schema...');
    execSync('FORCE_DB_REBUILD=true node -e "require(\'./server/migrate\').runMigrations(true).then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); })"', 
      { stdio: 'inherit' });
    
    console.log('\n✅ Database rebuild complete!');
    console.log('You can now restart your application with normal settings.');
    console.log('Default admin credentials:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    
  } catch (error) {
    console.error('\n❌ Database rebuild failed!', error);
  }
  
  rl.close();
}

main();