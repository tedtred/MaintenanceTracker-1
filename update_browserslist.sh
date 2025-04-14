#!/bin/bash

# This script updates the browserslist database
# It's designed to be run on a weekly schedule using Replit's scheduled tasks

echo "Starting browserslist database update at $(date)"

# Run the update script
node update-browserslist.mjs

echo "Browserslist update completed at $(date)"