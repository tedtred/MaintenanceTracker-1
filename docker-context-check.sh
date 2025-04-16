#!/bin/bash

# This script helps visualize what files will be included in your Docker build context
# after your .dockerignore rules are applied

echo "===========================================" 
echo "Docker Context Size Estimation"
echo "===========================================" 
echo "This shows what files Docker will use in your build"
echo

# Check if tar is available
if ! command -v tar &> /dev/null; then
    echo "Error: 'tar' command not found. This script requires tar to be installed."
    exit 1
fi

# Count total files before ignoring
FILE_COUNT_BEFORE=$(find . -type f | wc -l)

# Get total size before ignoring
SIZE_BEFORE=$(du -sh . | awk '{print $1}')

# Create a tar file with the same exclusions as Docker build context
# (Docker uses .dockerignore the same way tar uses --exclude-from)
echo "Creating temporary archive to analyze build context..."
tar -cf /tmp/docker-context.tar --exclude-from=.dockerignore .

# Get the size of the resulting archive
SIZE_AFTER=$(du -sh /tmp/docker-context.tar | awk '{print $1}')

# Count files in the archive
FILE_COUNT_AFTER=$(tar -tf /tmp/docker-context.tar | wc -l)

# Calculate directories
DIR_COUNT_AFTER=$(tar -tf /tmp/docker-context.tar | grep -c "/$")

# Remove the temporary archive
rm /tmp/docker-context.tar

echo "Directory size before .dockerignore: $SIZE_BEFORE"
echo "Docker build context size (approx):  $SIZE_AFTER"
echo 
echo "Files before .dockerignore: $FILE_COUNT_BEFORE"
echo "Files in Docker context:    $FILE_COUNT_AFTER"
echo "Directories in context:     $DIR_COUNT_AFTER"
echo 
echo "===========================================" 
echo "Top 10 largest files in build context:"
echo "===========================================" 

# List the largest files that would be included (not excluded by .dockerignore)
find . -type f | grep -v -f <(sed 's/^/.*/' .dockerignore | grep -v '^.*#' | grep -v '^$') | xargs ls -lh 2>/dev/null | sort -k5 -rh | head -n 10

echo
echo "===========================================" 
echo "TIP: Add large files to your .dockerignore if they're not needed in the build."
echo "===========================================" 