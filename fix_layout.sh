#!/bin/bash

# For each file that imports SidebarNav
for file in $(find client/src/pages -type f -name "*.tsx" | xargs grep -l "SidebarNav" | sort); do
  echo "Processing $file..."
  
  # Remove the SidebarNav import line
  sed -i '/import.*SidebarNav/d' "$file"
  
  # Replace the main layout structure (different patterns)
  # Pattern 1: Most common layout with flex h-screen and SidebarNav
  sed -i 's/<div className="flex h-screen">\s*<SidebarNav \/>/<div className="w-full">/' "$file"
  # Pattern 2: Remove any unnecessary nested div tags
  sed -i 's/<div className="flex-1 p-[0-9]* overflow-y-auto">/<div className="w-full">/' "$file"
  sed -i 's/<div className="flex-1 p-[0-9]*">/<div className="w-full">/' "$file"
  
  echo "Updated $file"
done

echo "All files processed!"
