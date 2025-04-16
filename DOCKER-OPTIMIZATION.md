# Docker Build Optimization Guide

This document outlines the optimizations made to improve Docker build speed for the CMMS application.

## Optimization Techniques Implemented

### 1. Dependency Installation
- Using `npm ci` instead of `npm install` for faster, more reliable installation
- Added `--prefer-offline` to utilize cached packages when available
- Added `--no-audit` to skip unnecessary security audits during build

### 2. Multi-Stage Build
- Separated build stage from runtime stage
- Only copying necessary production files to the final image
- Reduced final image size by excluding dev dependencies

### 3. Layer Optimization
- Ordered COPY instructions to maximize cache efficiency
- Files that change frequently are copied after less frequently changed files
- Consolidated multiple RUN commands into single commands where appropriate

### 4. Docker BuildKit
- Enabled Docker BuildKit in docker-compose.yml for parallel build operations
- Added inline cache hints to improve layer caching
- Build arguments are now explicitly configured for consistency

### 5. Context Optimization
- Enhanced .dockerignore file to exclude unnecessary files from the build context
- Reduced the amount of data that needs to be sent to the Docker daemon
- Excluded large logs, temporary files, and documentation from builds

### 6. Docker Rebuild Script
- Added `docker-rebuild.sh` utility script to rebuild only specific services
- Optional `--no-cache` parameter for complete rebuilds
- Sequential stopping, removing, rebuilding, and restarting for better control

### 7. Production-Specific Entry Point
- Created a dedicated Docker production server (`docker-server.js`)
- Removed all Vite dependencies from production server code
- Bundled server using esbuild during Docker build process

### 8. Fallback Mechanisms
- Enhanced entry point script to detect and use the most appropriate server file
- Implemented multiple fallback paths to ensure server startup
- Created Docker-specific utilities to handle environment differences

## Usage

### Normal Docker Compose Build
```bash
docker-compose build
docker-compose up -d
```

### Optimized Rebuild of a Single Service
```bash
./docker-rebuild.sh app
```

### Force Rebuild without Cache
```bash
./docker-rebuild.sh app --no-cache
```

## Environment Configuration

- Production mode is determined by `NODE_ENV=production`
- Docker detection uses `IS_DOCKER`, `DOCKER_ENV`, and `RUNNING_IN_DOCKER` environment variables
- Static file serving has been made more resilient with fallback mechanisms

## Vite Dependency Handling

The application handles Vite dependencies differently depending on the environment:

- **Development (Replit)**: Uses Vite for hot module reloading and development server
- **Production (Docker)**: Uses a dedicated server entry point with no Vite dependencies
- **Fallback Strategy**: If issues occur, the entrypoint script detects and uses the most appropriate server file

## Troubleshooting Docker Issues

### Common Docker Problems

1. **Missing Modules**: 
   - If you see "Cannot find package X", check if it's in package.json and properly installed
   - For Vite-related errors, they should be handled by our Docker-specific entry point

2. **Database Connection Issues**:
   - Check if PostgreSQL is running with `docker-compose ps`
   - Verify the DATABASE_URL environment variable is correctly set
   - Ensure the database container is healthy before the app starts

3. **Port Conflicts**:
   - If port 5000 is already in use, change the port mapping in docker-compose.yml
   - Check for conflicting services with `netstat -tulpn | grep 5000`

### Checking Docker Logs

To view logs for debugging:

```bash
# View logs for all services
docker-compose logs

# View logs for just the app
docker-compose logs app

# View real-time logs with follow flag
docker-compose logs -f app
```

## Further Optimization Ideas

1. Consider using a separate Dockerfile.prod specifically for production builds
2. Implement volume mounting for development to avoid rebuilding on code changes
3. If build times remain long, consider using a CI/CD pipeline to build images
4. For very large applications, explore using Docker image registry for caching built images