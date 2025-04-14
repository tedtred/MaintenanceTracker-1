#!/usr/bin/env node

/**
 * This script updates the browserslist database
 * It's meant to be run as a scheduled task (weekly or monthly)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Log with timestamp
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  
  // Also write to log file
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  fs.appendFileSync(
    path.join(logDir, 'browserslist-updates.log'),
    `[${timestamp}] ${message}\n`
  );
}

// Main function
function updateBrowserslist() {
  log('Starting browserslist database update...');
  
  try {
    // Run the update command
    const result = execSync('npx update-browserslist-db@latest', { encoding: 'utf8' });
    log('Update command executed successfully');
    log(result);
    
    // Write a timestamp file to track last update
    fs.writeFileSync(
      path.join(__dirname, '.browserslist-last-update'),
      new Date().toISOString()
    );
    
    log('Browserslist database update completed successfully');
    return true;
  } catch (error) {
    log(`Error updating browserslist database: ${error.message}`);
    if (error.stdout) log(`stdout: ${error.stdout}`);
    if (error.stderr) log(`stderr: ${error.stderr}`);
    return false;
  }
}

// Execute update if run directly
if (require.main === module) {
  updateBrowserslist();
}

module.exports = { updateBrowserslist };