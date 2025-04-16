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
  node /app/update-browserslist.mjs || echo "Browserslist update failed but continuing"
  
  # Run database schema update script without failing if it errors
  echo "Running database schema update script..."
  node /app/add-missing-columns.cjs || echo "Database schema update failed but continuing"
  
  # Patch the build just in case it still contains any Vite imports
  echo "Ensuring production build is free of Vite imports..."
  chmod +x /app/docker-build.cjs
  node /app/docker-build.cjs || echo "Build patching failed but continuing"
fi

# Execute the main command (node application)
echo "Starting application: $@"
exec "$@"