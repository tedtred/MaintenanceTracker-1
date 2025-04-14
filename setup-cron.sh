#!/bin/bash

# This script sets up a cron job to update the browserslist database weekly
# It's designed for the Replit environment but will work on any Linux system

echo "Setting up weekly browserslist database update..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Determine if we're in Replit or Docker environment
if [ -n "$REPL_ID" ] || [ -n "$REPL_SLUG" ]; then
  echo "Running in Replit environment"
  
  # Run the update once to make sure the database is current
  echo "Running initial update..."
  ./update_browserslist.sh
  
  # In Replit, we'll create a README note about scheduling
  echo "
# Browserslist Database Updates

To schedule weekly updates of the browserslist database on Replit:

1. Go to the 'Tools' menu
2. Select 'Scheduled Jobs'
3. Click 'Create a job'
4. Set the schedule to run weekly (e.g., every Sunday at 2:00 AM)
5. Set the command to: \`./update_browserslist.sh\`
6. Name the job 'Update Browserslist Database'
7. Click 'Create'

This will keep your browserslist database up to date and prevent warnings in the console.
" > BROWSERSLIST_UPDATE_INSTRUCTIONS.md
  
  echo "Created instructions for setting up scheduled jobs in Replit."
  echo "Please see BROWSERSLIST_UPDATE_INSTRUCTIONS.md for details."
  
elif [ -f /.dockerenv ] || grep -q docker /proc/1/cgroup 2>/dev/null; then
  echo "Running in Docker environment"
  
  # For Docker, we'll add a cron job
  if command -v crontab &>/dev/null; then
    # Create a temporary file for the crontab
    TEMP_CRON=$(mktemp)
    
    # Get existing crontab if any
    crontab -l > "$TEMP_CRON" 2>/dev/null || echo "# Browserslist update cron jobs" > "$TEMP_CRON"
    
    # Add our weekly update job if not already present
    if ! grep -q "update_browserslist.sh" "$TEMP_CRON"; then
      echo "# Run browserslist update every Sunday at 2:00 AM" >> "$TEMP_CRON"
      echo "0 2 * * 0 cd $(pwd) && ./update_browserslist.sh >> logs/browserslist_update.log 2>&1" >> "$TEMP_CRON"
      
      # Install the new crontab
      crontab "$TEMP_CRON"
      echo "Cron job installed successfully"
    else
      echo "Cron job already exists"
    fi
    
    # Clean up
    rm "$TEMP_CRON"
  else
    echo "WARNING: crontab command not found, skipping cron setup"
  fi
else
  echo "Running in standard environment"
  
  # For standard Linux environments
  if command -v crontab &>/dev/null; then
    # Create a temporary file for the crontab
    TEMP_CRON=$(mktemp)
    
    # Get existing crontab if any
    crontab -l > "$TEMP_CRON" 2>/dev/null || echo "# Browserslist update cron jobs" > "$TEMP_CRON"
    
    # Add our weekly update job if not already present
    if ! grep -q "update_browserslist.sh" "$TEMP_CRON"; then
      echo "# Run browserslist update every Sunday at 2:00 AM" >> "$TEMP_CRON"
      echo "0 2 * * 0 cd $(pwd) && ./update_browserslist.sh >> logs/browserslist_update.log 2>&1" >> "$TEMP_CRON"
      
      # Install the new crontab
      crontab "$TEMP_CRON"
      echo "Cron job installed successfully"
    else
      echo "Cron job already exists"
    fi
    
    # Clean up
    rm "$TEMP_CRON"
  else
    echo "WARNING: crontab command not found, skipping cron setup"
  fi
fi

# Run the update now to ensure the database is current
echo "Running browserslist update now..."
./update_browserslist.sh

echo "Setup complete!"
echo "You can manually run updates at any time with: ./update_browserslist.sh"
echo "Check the status of your browserslist database with: ./browserslist_check.sh"