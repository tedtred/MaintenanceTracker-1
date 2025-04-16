#!/bin/sh

# Enhanced entrypoint script for Docker container
# Designed to be robust in production environments

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
  export NODE_ENV=production
  
  # Write environment variables to .env file for persistence
  echo "# Docker environment configuration" > /app/.env
  echo "IS_DOCKER=true" >> /app/.env
  echo "DOCKER_ENV=true" >> /app/.env
  echo "RUNNING_IN_DOCKER=true" >> /app/.env
  echo "NODE_ENV=production" >> /app/.env
  
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

# Verify that dist/public directory exists
if [ ! -d "/app/dist/public" ]; then
  echo "WARNING: /app/dist/public directory not found. Frontend assets may be missing."
  mkdir -p /app/dist/public
fi

# No need to modify the index.js file anymore as we're using a dedicated Docker server
# that doesn't import Vite at all

# Execute the main command (node application)
echo "Starting application: $@"
exec "$@"