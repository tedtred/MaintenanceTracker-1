#!/bin/sh

# Simple entrypoint script for Docker container
# Designed to be minimal and robust

set -e

# Log our execution
echo "Starting container with entrypoint script at $(date)"

# Create logs directory
mkdir -p /app/logs

# Check for Docker environment
if [ -f /.dockerenv ]; then
  echo "Running in Docker environment"
  
  # Set environment variables for Docker detection
  export IS_DOCKER=true
  export DOCKER_ENV=true
  export RUNNING_IN_DOCKER=true
  
  # Write environment variables to .env file for persistence
  echo "# Docker environment detection" >> /app/.env
  echo "IS_DOCKER=true" >> /app/.env
  echo "DOCKER_ENV=true" >> /app/.env
  echo "RUNNING_IN_DOCKER=true" >> /app/.env
  
  # Run initial browserslist update without failing if it errors
  echo "Running initial browserslist update..."
  
  # Check which browserslist update file exists and use it
  if [ -f /app/update-browserslist.mjs ]; then
    node /app/update-browserslist.mjs || echo "Browserslist update failed but continuing"
  elif [ -f /app/update-browserslist.js ]; then
    node /app/update-browserslist.js || echo "Browserslist update failed but continuing"
  else
    echo "No browserslist update file found, skipping update"
  fi
fi

# Execute the main command (node application)
echo "Starting application: $@"
exec "$@"