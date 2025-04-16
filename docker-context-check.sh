#!/bin/bash

# Docker context size checking script
# This helps determine what's causing Docker build times to be slow due to large context

# Calculate the total size of the build context without exclusions
TOTAL_SIZE=$(du -sh . | awk '{print $1}')
echo "Total size of current directory: $TOTAL_SIZE"

# Simulate what Docker will actually send as the build context (.dockerignore applied)
echo "================================================"
echo "Simulating Docker build context calculation..."
echo "================================================"
tar -czh . -X .dockerignore | wc -c | awk '{printf "Actual Docker build context size: %.2f MB\n", $1/(1024*1024)}'

# Show the largest directories
echo "================================================"
echo "Largest directories in the project:"
echo "================================================"
du -h --max-depth=1 . | sort -hr | head -10

# Show the largest files
echo "================================================"
echo "Largest files in the project (>10MB):"
echo "================================================"
find . -type f -size +10M | xargs du -h 2>/dev/null | sort -hr

# Check .dockerignore file
echo "================================================"
echo "Current .dockerignore contents:"
echo "================================================"
if [ -f .dockerignore ]; then
  cat .dockerignore
else
  echo "No .dockerignore file found!"
  echo "Creating a basic .dockerignore file with common exclusions..."
  
  cat > .dockerignore << EOL
# Version control
.git
.gitignore

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Dependencies
node_modules
bower_components

# Build output
dist
build
out
.next
.nuxt

# Cache directories
.npm
.eslintcache
.stylelintcache
.cache
.parcel-cache

# Coverage directories
coverage
.nyc_output

# Editor directories and files
.idea
.vscode
*.swp
*.swo
*.swn
*.sublime-*
.DS_Store

# Dev/test environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Debug files
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Test files
__tests__
test
tests
*.test.js
*.spec.js

# Docker files (to avoid circular references)
Dockerfile
docker-compose.yml
EOL
  
  echo "Basic .dockerignore file created!"
fi

echo "================================================"
echo "Suggestions to improve Docker build time:"
echo "================================================"
echo "1. Add large files/directories to .dockerignore"
echo "2. Remove any unnecessary files from the project"
echo "3. Move large assets to a separate repository or storage"
echo "4. Ensure node_modules is in .dockerignore"
echo "5. Consider using multi-stage builds to minimize final image size"
echo "================================================"