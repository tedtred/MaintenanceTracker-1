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

# Install ONLY production dependencies
RUN npm ci --omit=dev

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Add postgresql-client for database operations
RUN apk add --no-cache postgresql-client

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set proper permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV HOST=0.0.0.0

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start command (use node directly to run the built server)
CMD ["node", "dist/index.js"]