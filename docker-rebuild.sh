#!/bin/bash

# Simple Docker rebuild script with improved stability
# Usage: ./docker-rebuild.sh [service_name] [--no-cache]

set -e

# Check if we need to rebuild the entire project or just a specific service
SERVICE=${1:-""}
NO_CACHE=""

# Check for --no-cache flag
if [[ "$*" == *--no-cache* ]]; then
  NO_CACHE="--no-cache"
  echo "Rebuilding without cache"
fi

# Stop any running containers
echo "Stopping containers..."
docker-compose down || true

# Remove any existing containers (force)
echo "Removing existing containers..."
if [ -n "$SERVICE" ]; then
  docker-compose rm -f "$SERVICE" || true
else
  docker-compose rm -f || true
fi

# If rebuilding the app service specifically, do some cleanup
if [ "$SERVICE" == "app" ] || [ -z "$SERVICE" ]; then
  echo "Cleaning build artifacts..."
  rm -rf dist/* || true
  
  echo "Ensuring directories exist..."
  mkdir -p dist/public
  mkdir -p logs
  
  echo "Copying production server..."
  cp cmms-prod-server.js dist/ || true
fi

# Build the service(s)
echo "Building service(s)..."
if [ -n "$SERVICE" ]; then
  docker-compose build $NO_CACHE "$SERVICE"
else
  docker-compose build $NO_CACHE
fi

# Start the rebuilt containers
echo "Starting containers..."
docker-compose up -d

# Wait a moment for services to start
echo "Waiting for services to start..."
sleep 5

# Show running containers
echo "Currently running containers:"
docker-compose ps

# Show logs for the app service if applicable
if [ "$SERVICE" == "app" ] || [ -z "$SERVICE" ]; then
  echo "Recent app logs:"
  docker-compose logs --tail=50 app
fi

echo "Rebuild completed! Check the logs for any errors."