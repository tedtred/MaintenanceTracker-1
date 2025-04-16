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

# Check if the command to execute is node dist/index.js, and if the file doesn't exist
if [ "$1" = "node" ] && [ "$2" = "dist/index.js" ] && [ ! -f /app/dist/index.js ]; then
  echo "Warning: /app/dist/index.js not found, checking for alternatives..."
  
  # Check if we have a prod-server.js file we can execute instead
  if [ -f /app/dist/prod-server.js ]; then
    echo "Found prod-server.js, executing that instead"
    exec node /app/dist/prod-server.js
  elif [ -f /app/server/prod-server.js ]; then
    echo "Found server/prod-server.js, executing that instead"
    exec node /app/server/prod-server.js
  elif [ -f /app/server/index.js ]; then
    echo "Found server/index.js, executing that instead"
    exec node /app/server/index.js
  else
    echo "No alternative server file found, will try to run original command anyway"
  fi
fi

# Execute the main command (node application)
echo "Starting application: $@"
exec "$@"