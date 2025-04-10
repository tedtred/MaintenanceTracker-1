#!/bin/bash

# For each file that imports SidebarNav
for file in $(find client/src/pages -type f -name "*.tsx" | xargs grep -l "SidebarNav" | sort); do
  echo "Processing $file..."
  
  # Remove the SidebarNav import
  sed -i '/import.*SidebarNav/d' "$file"
  
  # Replace the layout pattern
  sed -i 's/<div className="flex h-screen">\s*<SidebarNav \/>/<div className="w-full">/' "$file"
  
  # Adjust the flex-1 div that usually follows
  sed -i 's/<div className="flex-1 p-[0-9]* overflow-y-auto">/<div>/' "$file"
  
  echo "Updated $file"
done

echo "All files processed!"
