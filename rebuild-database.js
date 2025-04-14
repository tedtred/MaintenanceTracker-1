/**
 * This script will force a full database rebuild by setting the 
 * FORCE_DB_REBUILD environment variable to "true" temporarily.
 * 
 * Usage:
 * node rebuild-database.js
 */

import { createInterface } from 'readline';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Function to prompt the user
function askQuestion(query) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  console.log("\n===== CMMS Database Rebuild Utility =====\n");
  console.log("⚠️  WARNING: This will DELETE ALL DATA in your database and rebuild it from scratch!");
  console.log("This should only be used in the following cases:");
  console.log("  - Initial setup");
  console.log("  - Recovery from database corruption");
  console.log("  - Database schema changes that cannot be applied incrementally");
  console.log("\nAll existing data will be lost and cannot be recovered!\n");
  
  const continueAnswer = await askQuestion("Do you want to continue? (yes/no): ");
  
  if (continueAnswer.toLowerCase() !== 'yes' && continueAnswer.toLowerCase() !== 'y') {
    console.log("Database rebuild cancelled.");
    process.exit(0);
  }
  
  console.log("\n⚠️  FINAL CONFIRMATION ⚠️");
  const confirmAnswer = await askQuestion("Type 'REBUILD' to confirm database rebuild: ");
  
  if (confirmAnswer !== 'REBUILD') {
    console.log("Confirmation failed. Database rebuild cancelled.");
    process.exit(0);
  }
  
  console.log("\nStarting database rebuild...");
  
  try {
    // Set the environment variable for the child process
    const envWithForceRebuild = {
      ...process.env,
      FORCE_DB_REBUILD: 'true'
    };

    // Execute server with force rebuild
    console.log("Running server with FORCE_DB_REBUILD=true...");
    const { stdout, stderr } = await execPromise('tsx server/index.ts --run-migrations --force', { 
      env: envWithForceRebuild,
      timeout: 30000 // 30 seconds timeout
    });
    
    if (stderr) {
      console.error("Error output:", stderr);
    }
    
    if (stdout) {
      console.log("Output:", stdout);
    }
    
    console.log("✅ Database rebuild completed successfully!");
    console.log("Default admin user created with credentials:");
    console.log("  Username: admin");
    console.log("  Password: admin123");
    console.log("\nIMPORTANT: Change this password immediately after logging in!");
  } catch (error) {
    console.error("❌ Error during database rebuild:", error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error("Unhandled error:", error);
  process.exit(1);
});