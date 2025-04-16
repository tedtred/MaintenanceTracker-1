# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with cache optimization
RUN npm ci --prefer-offline --no-audit

# Copy source files in priority order (for better layer caching)
COPY shared ./shared
COPY server ./server
COPY client ./client
COPY drizzle.config.ts docker-build.cjs docker-entrypoint.sh add-missing-columns.cjs update-browserslist.mjs ./

# Copy remaining files
COPY . .

# Set production environment for build
ENV NODE_ENV=production

# Make docker build script executable
RUN chmod +x ./docker-build.cjs

# Build the application using Docker-specific build script that removes Vite references
RUN node ./docker-build.cjs

# Production stage
FROM node:18-alpine AS runner

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY drizzle.config.ts ./

# Install only what's needed for production, with explicit versioning for stability
# Uses --no-audit and --prefer-offline for speed
RUN npm ci --omit=dev --no-audit --prefer-offline && npm install --no-save --no-audit --prefer-offline \
    pg \
    drizzle-orm \
    drizzle-kit

# Copy schema and migrations
COPY shared ./shared

# Copy built assets from builder - ensure we get all necessary directories
COPY --from=builder /app/dist ./dist

# Create public directory structure to avoid errors
RUN mkdir -p ./dist/public

# Add postgresql-client and set up user permissions in a single layer
RUN apk add --no-cache postgresql-client && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy our entrypoint script and utility scripts
COPY docker-entrypoint.sh update-browserslist.mjs add-missing-columns.cjs docker-build.cjs /app/

# Set proper permissions in a single command
USER root
RUN chmod +x /app/docker-entrypoint.sh && chown -R nextjs:nodejs /app
USER nextjs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV HOST=0.0.0.0
ENV IS_DOCKER=true
ENV DOCKER_ENV=true
ENV RUNNING_IN_DOCKER=true

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Use our entrypoint script
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]