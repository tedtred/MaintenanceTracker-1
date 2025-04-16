# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies)
RUN npm install

# Copy source code
COPY . .

# Set production environment for build
ENV NODE_ENV=production

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY drizzle.config.ts ./

# Install production dependencies plus development dependencies required for the build
RUN npm ci --omit=dev && npm install --no-save drizzle-orm drizzle-kit pg dotenv
# Install Vite as a dependency rather than dev dependency to avoid import errors
RUN npm install --no-save vite @vitejs/plugin-react

# Copy schema and migrations
COPY shared ./shared

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Add postgresql-client for database operations
RUN apk add --no-cache postgresql-client

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy our entrypoint script and update script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
COPY update-browserslist.mjs /app/update-browserslist.mjs

# Set proper permissions and make the entrypoint script executable
USER root
RUN chmod +x /app/docker-entrypoint.sh
RUN chown -R nextjs:nodejs /app
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