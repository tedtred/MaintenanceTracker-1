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
  node /app/add-missing-columns-for-docker.js || echo "Database schema update failed but continuing"
fi

# In production Docker environment, use the production server file if available
if [ -f /.dockerenv ] && [ "$NODE_ENV" = "production" ]; then
  if [ -f /app/docker-server.js ]; then
    echo "Using pre-compiled production-specific server file"
    
    # Set environment variables for Vite
    export VITE_ENABLED=false
    export USE_VITE=false
    
    # Use the pre-compiled JavaScript file
    exec node /app/docker-server.js
  elif [ -f /app/server/prod-index.ts ]; then
    echo "Using production-specific server file"
    # Compile the TypeScript file using tsx directly
    echo "Starting production server with tsx..."
    
    # Set environment variables for Vite
    export VITE_ENABLED=false
    export USE_VITE=false
    
    # Use tsx to run the TypeScript file directly
    exec npx tsx /app/server/prod-index.ts
  else
    echo "Production server file not found, using default server"
  fi
fi

# Execute the main command (node application) if not using production server
echo "Starting application: $@"
exec "$@"