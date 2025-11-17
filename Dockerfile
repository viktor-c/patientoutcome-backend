# Multi-stage build for production optimization
FROM node:24-slim AS builder

# Install pnpm globally
RUN npm install -g pnpm

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Production stage
FROM node:24-slim AS production

# Install pnpm globally
RUN npm install -g pnpm

# Create app directory
WORKDIR /usr/src/app

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod --ignore-scripts && pnpm store prune

# Copy built application from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Change ownership to non-root user
RUN chown -R appuser:appuser /usr/src/app
USER appuser

# Expose port (configurable via environment variable)
EXPOSE 40001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 40001) + '/health-check', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the app
CMD ["node", "dist/index.js"]
