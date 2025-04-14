#!/usr/bin/env node

/**
 * This script sets up the cron job to run the browserslist update weekly
 * 
 * For Docker environments, this will create a crontab entry
 * For non-Docker environments, it will create a scheduled task using the available scheduler
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Determine if we're in a Docker environment
const isDocker = fs.existsSync('/.dockerenv') || 
                 fs.existsSync('/proc/1/cgroup') && 
                 fs.readFileSync('/proc/1/cgroup', 'utf8').includes('docker');

// Determine if we're in a Replit environment
const isReplit = !!process.env.REPL_ID || !!process.env.REPL_SLUG;

// Log helper
function log(message) {
  console.log(`[CRON SETUP] ${message}`);
}

// Setup for Docker environment
function setupDockerCron() {
  log('Setting up cron job in Docker environment');
  
  try {
    // Write the cronjob file
    const cronContent = `# Run browserslist update every Sunday at 2:00 AM
0 2 * * 0 cd /app && node update-browserslist.js >> /var/log/cron.log 2>&1
`;
    
    fs.writeFileSync('/etc/cron.d/browserslist-update', cronContent);
    log('Created cron job file: /etc/cron.d/browserslist-update');
    
    // Make it executable
    execSync('chmod 0644 /etc/cron.d/browserslist-update');
    log('Set appropriate permissions for cron job file');
    
    // Apply the cron job
    execSync('crontab /etc/cron.d/browserslist-update');
    log('Installed cron job successfully');
    
    return true;
  } catch (error) {
    log(`Error setting up Docker cron job: ${error.message}`);
    return false;
  }
}

// Setup for Replit environment
function setupReplitCron() {
  log('Setting up scheduled task in Replit environment');
  
  try {
    // For Replit, we'll create a .replit file entry if not already present
    const replitConfigPath = path.join(__dirname, '.replit');
    
    let configContent = '';
    if (fs.existsSync(replitConfigPath)) {
      configContent = fs.readFileSync(replitConfigPath, 'utf8');
    }
    
    // Check if the run already has an entry for our update task
    if (!configContent.includes('browserslist-update')) {
      // Add a new run command for the update
      const newEntry = `
[scheduled-job.browserslist-update]
command = "node update-browserslist.js"
schedule = "0 2 * * 0" # Run at 2:00 AM every Sunday
`;
      
      fs.appendFileSync(replitConfigPath, newEntry);
      log('Added scheduled task to .replit config');
    } else {
      log('Scheduled task already exists in .replit config');
    }
    
    return true;
  } catch (error) {
    log(`Error setting up Replit scheduled task: ${error.message}`);
    return false;
  }
}

// Setup for generic environment (local development)
function setupLocalCron() {
  log('Setting up scheduled task for local environment');
  
  const platform = os.platform();
  
  try {
    if (platform === 'win32') {
      // Windows - use Task Scheduler
      log('Detected Windows environment, using Task Scheduler');
      
      const scriptPath = path.resolve(__dirname, 'update-browserslist.js');
      const nodePath = process.execPath;
      
      const command = `schtasks /create /tn "BrowserslistUpdate" /tr "${nodePath} ${scriptPath}" /sc WEEKLY /d SUN /st 02:00 /f`;
      execSync(command);
      
      log('Created Windows scheduled task: BrowserslistUpdate');
    } else {
      // Linux/Mac - use crontab
      log('Detected Unix environment, using crontab');
      
      const scriptPath = path.resolve(__dirname, 'update-browserslist.js');
      const cronJob = `0 2 * * 0 cd ${__dirname} && node ${scriptPath} >> ${path.join(__dirname, 'logs', 'cron.log')} 2>&1`;
      
      // Add to user's crontab
      const tempFile = path.join(os.tmpdir(), 'temp-crontab');
      
      // Get existing crontab
      let currentCrontab = '';
      try {
        currentCrontab = execSync('crontab -l', { encoding: 'utf8' });
      } catch (e) {
        // Might fail if no crontab exists yet, which is fine
      }
      
      // Check if our job is already there
      if (!currentCrontab.includes('update-browserslist.js')) {
        fs.writeFileSync(tempFile, currentCrontab + cronJob + '\n');
        execSync(`crontab ${tempFile}`);
        fs.unlinkSync(tempFile);
        
        log('Added cron job to user crontab');
      } else {
        log('Cron job already exists in user crontab');
      }
    }
    
    return true;
  } catch (error) {
    log(`Error setting up local scheduled task: ${error.message}`);
    return false;
  }
}

// Main function
function setupCronJob() {
  log('Starting scheduled task setup...');
  
  // Create logs directory if it doesn't exist
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
    log('Created logs directory');
  }
  
  let success = false;
  
  if (isDocker) {
    success = setupDockerCron();
  } else if (isReplit) {
    success = setupReplitCron();
  } else {
    success = setupLocalCron();
  }
  
  if (success) {
    log('Scheduled task setup completed successfully');
    
    // Run the update immediately to ensure the browserslist database is up to date
    log('Running initial update...');
    require('./update-browserslist').updateBrowserslist();
  } else {
    log('Failed to set up scheduled task');
  }
}

// Run the setup if executed directly
if (require.main === module) {
  setupCronJob();
}

module.exports = { setupCronJob };