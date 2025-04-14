#!/bin/bash

# This script is used as the entrypoint for the Docker container
# It sets up and runs the application, including scheduling the browserslist update

set -e

# Create logs directory if it doesn't exist
mkdir -p /app/logs

echo "Setting up browserslist update cron job..."
# Add cron job to update browserslist weekly (Sunday at 2 AM)
if [ -f /.dockerenv ]; then
  echo "Running in Docker environment"
  
  # Make sure cron is installed
  if command -v crontab &> /dev/null; then
    echo "0 2 * * 0 cd /app && node update-browserslist.mjs >> /app/logs/cron.log 2>&1" | crontab -
    echo "Cron job installed"
    
    # Start cron service if available
    if command -v service &> /dev/null; then
      service cron start || echo "Failed to start cron service"
    elif command -v crond &> /dev/null; then
      crond -b || echo "Failed to start crond in background"
    else
      echo "No cron service available"
    fi
  else
    echo "Crontab not found, skipping cron setup"
  fi
  
  # Run the update once at startup
  echo "Running initial browserslist update..."
  node update-browserslist.mjs
fi

# Execute the main command (typically starting the Node.js application)
exec "$@"