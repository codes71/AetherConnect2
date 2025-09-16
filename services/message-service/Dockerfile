FROM node:20-alpine

WORKDIR /app

# Copy root package files including workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy shared packages and services
COPY packages ./packages
COPY services ./services

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Set working directory to message service
WORKDIR /app/services/message-service

# Build the application
RUN pnpm run build

# Expose ports (WebSocket and gRPC)
EXPOSE 3002 50002

# Start the application
CMD ["pnpm", "run", "start"]
