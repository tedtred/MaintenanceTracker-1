#!/bin/bash

# This script checks if the browserslist database is current and outputs status

echo "Checking browserslist database status..."

# Check if last update file exists
if [ -f .browserslist-last-update ]; then
  last_update=$(cat .browserslist-last-update)
  echo "Last browserslist update: $last_update"
  
  # Calculate time since last update
  last_update_seconds=$(date -d "$last_update" +%s)
  current_seconds=$(date +%s)
  diff_seconds=$((current_seconds - last_update_seconds))
  diff_days=$((diff_seconds / 86400))
  
  echo "Days since last update: $diff_days"
  
  if [ $diff_days -gt 30 ]; then
    echo "WARNING: Browserslist database is over 30 days old. Consider running an update."
    echo "Run ./update_browserslist.sh to update."
  else
    echo "Browserslist database is up to date."
  fi
else
  echo "No record of browserslist updates found."
  echo "Run ./update_browserslist.sh to update the database."
fi