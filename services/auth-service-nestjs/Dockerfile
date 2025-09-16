FROM node:20-alpine

WORKDIR /app

# Copy root package files and workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all packages and services (monorepo structure)
COPY packages ./packages
COPY services ./services

# Install pnpm and all workspace dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Set working directory to auth service
WORKDIR /app/services/auth-service-nestjs

# Build the application (dependencies already installed via workspace)
RUN pnpm run build

# Expose port
EXPOSE 3001

# Start the application
CMD ["pnpm", "run", "start"]
