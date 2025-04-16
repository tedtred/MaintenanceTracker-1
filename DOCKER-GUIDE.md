# Docker Deployment Guide for Maintenance Tracker

## Recent Compatibility Fixes

We've implemented several critical fixes to ensure cross-environment compatibility between Replit and Docker deployments:

1. **Pre-compiled JavaScript Files**: Created vanilla JavaScript versions of critical files to bypass TypeScript compilation issues in Docker:
   - `add-missing-columns-for-docker.js`: CommonJS version of database migration script
   - `docker-server.js`: Production-ready server without TypeScript dependencies

2. **Database Schema Adapters**: Implemented comprehensive database migration that detects and fixes schema differences between environments (column names, missing fields, etc.)

3. **Fallback Mechanisms**: Added multiple fallback options in the entrypoint script to ensure the application starts even if certain components fail:
   - Tries pre-compiled JS files first
   - Falls back to TypeScript files if JS versions aren't available
   - Continues execution even if migration scripts fail

4. **Environment Detection**: Added consistent environment variables (`IS_DOCKER`, `DOCKER_ENV`, `RUNNING_IN_DOCKER`) to detect Docker environments correctly.

5. **Vite Bypass**: Disabled Vite in production Docker environments to avoid frontend build tool issues.

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
     docker-compose exec app node /app/add-missing-columns-for-docker.js
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

## Known Differences Between Environments

Some column names and schema details might differ slightly between Replit and Docker environments:

- `creates_work_order` vs `create_work_order` in problem_buttons table
- Some columns like `work_week_start`, `order`, `field_name` might be missing in older Docker deployments

The migration script automatically detects and corrects these differences.