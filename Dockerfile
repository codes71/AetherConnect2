FROM node:20

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files and workspace config
COPY package.json tsconfig.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all packages and services
COPY packages ./packages
COPY services ./services

# Install pm2 and netcat for health checks
RUN apt-get update && npm install -g pm2 && apt-get install -y netcat-openbsd

# Copy environment file
COPY .env ./.env

# Install dependencies with pnpm
RUN pnpm install --frozen-lockfile

# Install dependencies for shared package and build it
RUN cd packages/shared && pnpm install && pnpm run build && ls -la dist/

RUN ls -lR services/
# Install dependencies and build auth service
RUN cd services/auth-service-nestjs && pnpm install && pnpm run build && test -f dist/main.js
# Install dependencies and build message service
RUN cd services/message-service && pnpm install && pnpm run build && test -f dist/main.js
# Install dependencies and build API gateway
RUN cd services/api-gateway && pnpm install && pnpm run build && test -f dist/main.js


# Create PM2 ecosystem file and startup script
COPY ecosystem.config.js ./
COPY start.sh ./
RUN chmod +x start.sh

# Expose ports
EXPOSE 3000 3001 3002

# Health check for the API Gateway
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start all services with coordinated startup
CMD ["./start.sh"]
