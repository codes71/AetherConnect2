FROM node:20-alpine

WORKDIR /app

# Copy package files and tsconfig
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./

# Copy all packages and services
COPY packages ./packages
COPY services ./services

# Install pnpm, pm2, and netcat for health checks
RUN npm install -g pnpm pm2
RUN apk add --no-cache netcat-openbsd
RUN pnpm install --frozen-lockfile

# Build all services
RUN cd packages/shared && pnpm run build && ls -la dist/

RUN ls -lR services/
# Ensure workspace linking works
RUN cd services/auth-service-nestjs && pnpm build && test -f dist/main.js
RUN cd services/message-service && pnpm build && test -f dist/main.js
RUN cd services/api-gateway && pnpm build && test -f dist/main.js


# Create PM2 ecosystem file and startup script
COPY ecosystem.config.js ./
COPY start.sh ./
RUN chmod +x start.sh

# Expose ports
EXPOSE 3000 3001 3002

# Health check for the API Gateway
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || curl -f http://localhost:3000/api/health || exit 1

# Start all services with coordinated startup
CMD ["./start.sh"]
