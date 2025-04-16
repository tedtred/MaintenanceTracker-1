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

# Check if the command to execute is for a server file that doesn't exist
if [ "$1" = "node" ] && [ ! -f "/app/$2" ]; then
  echo "Warning: /app/$2 not found, checking for alternatives..."
  
  # First try our dedicated Docker server file
  if [ -f /app/dist/docker-server.js ]; then
    echo "Found dist/docker-server.js, executing that instead"
    exec node /app/dist/docker-server.js
  # Then try other server files
  elif [ -f /app/server/docker-server.js ]; then
    echo "Found server/docker-server.js, executing that instead"
    exec node /app/server/docker-server.js
  elif [ -f /app/dist/prod-server.js ]; then
    echo "Found dist/prod-server.js, executing that instead"
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

# Ensure stub modules work correctly by setting NODE_PATH
export NODE_PATH="/app/node_modules"
echo "Set NODE_PATH=${NODE_PATH}"

# Set special flag to indicate we're using stubs
export USE_VITE_STUBS=true
echo "Set USE_VITE_STUBS=true"

# Execute the main command (node application)
echo "Starting application: $@"
exec "$@"