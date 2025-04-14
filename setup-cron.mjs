#!/usr/bin/env node

/**
 * This script sets up the cron job to run the browserslist update weekly
 * 
 * For Docker environments, this will create a crontab entry
 * For non-Docker environments, it will create a scheduled task using the available scheduler
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { updateBrowserslist } from './update-browserslist.mjs';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine if we're in a Docker environment
const isDocker = fs.existsSync('/.dockerenv') || 
                (fs.existsSync('/proc/1/cgroup') && 
                 fs.readFileSync('/proc/1/cgroup', 'utf8').includes('docker'));

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
0 2 * * 0 cd /app && node update-browserslist.mjs >> /var/log/cron.log 2>&1
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
    // For Replit, we'll update the package.json to include a scheduled task
    const packageJsonPath = path.join(__dirname, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Add the browserslist update script if it doesn't exist
      if (!packageJson.scripts['update-browserslist']) {
        packageJson.scripts['update-browserslist'] = 'node update-browserslist.mjs';
        
        // Write the updated package.json
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        log('Added update-browserslist script to package.json');
      }
    }
    
    // Create a .replit tasks file if it doesn't exist
    const replitNixPath = path.join(__dirname, '.replit');
    
    if (!fs.existsSync(replitNixPath) || !fs.readFileSync(replitNixPath, 'utf8').includes('scheduled-job')) {
      // Append the scheduled job configuration
      const scheduledJobConfig = `
[scheduled-job.update-browserslist]
command = "npm run update-browserslist"
schedule = "0 2 * * 0" # Run at 2:00 AM every Sunday

`;
      fs.appendFileSync(replitNixPath, scheduledJobConfig);
      log('Added scheduled job configuration to .replit file');
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
      
      const scriptPath = path.resolve(__dirname, 'update-browserslist.mjs');
      const nodePath = process.execPath;
      
      const command = `schtasks /create /tn "BrowserslistUpdate" /tr "${nodePath} ${scriptPath}" /sc WEEKLY /d SUN /st 02:00 /f`;
      execSync(command);
      
      log('Created Windows scheduled task: BrowserslistUpdate');
    } else {
      // Linux/Mac - use crontab
      log('Detected Unix environment, using crontab');
      
      const scriptPath = path.resolve(__dirname, 'update-browserslist.mjs');
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
      if (!currentCrontab.includes('update-browserslist.mjs')) {
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
export function setupCronJob() {
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
    updateBrowserslist();
  } else {
    log('Failed to set up scheduled task');
  }
}

// Run the setup if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupCronJob();
}