#!/bin/bash
# Script to check container logs and debug Docker issues

echo "==============================================="
echo "Docker Debugging Script"
echo "==============================================="

# Get the container ID for the app container
APP_CONTAINER=$(docker ps -a | grep maintenancetracker-1_app | awk '{print $1}')

if [ -z "$APP_CONTAINER" ]; then
  echo "App container not found. Checking for any container with app in name..."
  APP_CONTAINER=$(docker ps -a | grep app | awk '{print $1}')
fi

if [ -z "$APP_CONTAINER" ]; then
  echo "No app container found."
  echo "Here are all running containers:"
  docker ps -a
  exit 1
fi

echo "Found app container: $APP_CONTAINER"
echo "==============================================="
echo "Container Logs:"
echo "==============================================="
docker logs $APP_CONTAINER

echo "==============================================="
echo "Health Check Status:"
echo "==============================================="
docker inspect --format='{{json .State.Health}}' $APP_CONTAINER | jq

echo "==============================================="
echo "Last 3 Health Check Results:"
echo "==============================================="
docker inspect --format='{{range .State.Health.Log}}{{json .}}{{end}}' $APP_CONTAINER | jq -c '.Output' | tail -3

echo "==============================================="
echo "Container Environment Variables:"
echo "==============================================="
docker exec $APP_CONTAINER env | sort