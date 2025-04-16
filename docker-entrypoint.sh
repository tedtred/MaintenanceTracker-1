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
  
  # Run initial browserslist update without failing if it errors
  echo "Running initial browserslist update..."
  node /app/update-browserslist.mjs || echo "Browserslist update failed but continuing"
fi

# Execute the main command (node application)
echo "Starting application: $@"
exec "$@"