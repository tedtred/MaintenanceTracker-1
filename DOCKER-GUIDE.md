# Docker Deployment Guide for Maintenance Tracker

## Recent Compatibility Fixes

We've implemented several critical fixes to ensure cross-environment compatibility between Replit and Docker deployments:

1. **Database Schema Adapters**: Created a comprehensive database migration script (CommonJS format) that detects and adds any missing columns needed in the Docker environment.

2. **Module System Compatibility**: Created a CommonJS version (.cjs) of scripts to ensure compatibility with Docker environments regardless of Node.js module settings.

3. **Production Server Configuration**: Added a production-specific server entry point that doesn't require Vite in production.

4. **TypeScript Integration**: Updated Docker configuration to use TypeScript in the container through the `tsx` package.

5. **Environment Detection**: Added consistent environment variables to detect Docker environments correctly.

6. **Filename Extensions**: Updated import statements to use correct extension-less imports for TypeScript compatibility.

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

1. Check logs with `docker-compose logs app`
2. Ensure database is accessible with `docker-compose logs db`
3. For schema issues, you can try setting `FORCE_DB_REBUILD=true` temporarily in docker-compose.yml

## Known Differences Between Environments

Some column names and schema details might differ slightly between Replit and Docker environments:

- `creates_work_order` vs `create_work_order` in problem_buttons table
- Some columns like `work_week_start`, `order`, `field_name` might be missing in older Docker deployments

The migration script automatically detects and corrects these differences.