# Docker Deployment Guide for Maintenance Tracker

## Recent Compatibility Fixes

We've implemented several critical fixes to ensure cross-environment compatibility between Replit and Docker deployments:

1. **CommonJS Format Scripts**: Created explicit CommonJS versions (with .cjs extension) to avoid conflicts with ES Modules:
   - `add-missing-columns-for-docker.cjs`: CommonJS version of the database migration script
   - `docker-server.cjs`: Production-ready server without TypeScript dependencies

2. **Resilient Module Loading**: Added retry mechanisms that attempt to load required modules multiple times:
   - Automatically retries imports up to 10 times with delays between attempts
   - Provides detailed error messages for module loading failures
   - Makes Docker deployment much more robust against timing issues

3. **Database Schema Adapters**: Implemented comprehensive database migration that detects and fixes schema differences between environments (column names, missing fields, etc.)

4. **Multi-level Fallbacks**: Added multiple fallback options in the entrypoint script:
   - Tries pre-compiled CJS files first
   - Falls back to TypeScript files if CJS versions aren't available
   - Continues execution even if migration scripts fail

5. **Environment Detection**: Added consistent environment variables (`IS_DOCKER`, `DOCKER_ENV`, `RUNNING_IN_DOCKER`) for reliable Docker detection.

6. **Docker-specific Paths**: Using absolute paths within Docker container (/app/server/...) instead of relative paths to fix module loading issues.

7. **Vite Bypass**: Disabled Vite in production Docker environments to avoid frontend build tool issues.

## Deploying with Docker

To deploy the application with Docker:

1. Make sure Docker and Docker Compose are installed on your system.
2. Clone the repository.
3. Run `docker-compose up -d` to start the application in detached mode.
4. The application will be available at http://localhost:5000
5. PgAdmin will be available at http://localhost:8080 (credentials: admin@admin.com / admin)

## Configuration Options

The application can be configured through environment variables in the docker-compose.yml file:

- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret key for encrypting sessions
- `FORCE_DB_REBUILD`: Set to "true" ONLY for initial deployment to build schema
- `ALLOW_ORIGIN`: Allow connections from specific origins

## Troubleshooting

If you experience issues with the Docker deployment:

1. **Check container logs:**
   ```bash
   docker-compose logs app    # Application logs
   docker-compose logs db     # Database logs
   docker-compose logs        # All container logs together
   ```

2. **Database schema issues:**
   - Set `FORCE_DB_REBUILD=true` temporarily in docker-compose.yml (WARNING: This will wipe your database)
   - Alternatively, run the migration script manually:
     ```bash
     docker-compose exec app node /app/add-missing-columns-for-docker.cjs
     ```

3. **Container fails to start:**
   - Try rebuilding the container:
     ```bash
     docker-compose down
     docker-compose build --no-cache
     docker-compose up -d
     ```

4. **Application runs but API endpoints fail:**
   - Check if the database connection is working:
     ```bash
     docker-compose exec app npx drizzle-kit introspect:pg
     ```
   
5. **Frontend loads but API returns 500 errors:**
   - Inspect network requests in browser dev tools
   - Check if API route exists:
     ```bash 
     docker-compose exec app curl http://localhost:5000/api/health
     ```

6. **Module loading issues:**
   - If you see "Cannot find module" errors, it's likely a path resolution issue 
   - Our server is configured to use absolute paths (/app/server/...) in Docker
   - If custom modules are added, make sure to use absolute paths in docker-server.cjs
   - You can examine the container's file structure:
     ```bash
     docker-compose exec app ls -la /app
     docker-compose exec app ls -la /app/server
     ```

## Known Differences Between Environments

Some column names and schema details might differ slightly between Replit and Docker environments:

- `creates_work_order` vs `create_work_order` in problem_buttons table
- Some columns like `work_week_start`, `order`, `field_name` might be missing in older Docker deployments

The migration script automatically detects and corrects these differences.