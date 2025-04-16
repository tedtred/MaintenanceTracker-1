#!/bin/bash

# Helper script to optimize Docker builds
# Usage: ./docker-rebuild.sh [service_name] [--no-cache]

# Default values
SERVICE="app"
NO_CACHE=""

# Parse arguments
if [ "$1" != "" ]; then
  SERVICE="$1"
fi

if [ "$2" == "--no-cache" ]; then
  NO_CACHE="--no-cache"
fi

echo "🚀 Optimized Docker rebuild for $SERVICE service"

# Stop only the selected service
echo "📌 Stopping existing $SERVICE service..."
docker-compose stop $SERVICE

# Remove the selected service container 
echo "📌 Removing $SERVICE container..."
docker-compose rm -f $SERVICE

# Build with optimized settings
echo "📌 Building $SERVICE with optimized settings $NO_CACHE..."
DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1 docker-compose build $NO_CACHE $SERVICE

# Start only the selected service
echo "📌 Starting $SERVICE service..."
docker-compose up -d $SERVICE

# Show logs for debug purposes
echo "📌 Showing logs for $SERVICE..."
docker-compose logs -f $SERVICE