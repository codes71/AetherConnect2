FROM node:20-alpine

WORKDIR /app

# Copy package files and tsconfig
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./

# Copy all packages and services
COPY packages ./packages
COPY services ./services

# Install pnpm and dependencies
RUN npm install -g pnpm pm2
RUN pnpm install --frozen-lockfile

# Build all services
RUN cd packages/shared && pnpm run build && ls -la dist/

# Ensure workspace linking works
RUN pnpm install --frozen-lockfile
RUN cd services/auth-service-nestjs && pnpm run build && test -f dist/main.js
RUN cd services/message-service && pnpm run build  && test -f dist/main.js
RUN cd services/api-gateway && pnpm run build

# --- DEBUGGING STEP ---
# List all files to check if build artifacts exist
RUN ls -lR services/*/dist/main.js
# --- END DEBUGGING STEP ---

# Create PM2 ecosystem file and startup script
COPY ecosystem.config.js ./
COPY start.sh ./
RUN chmod +x start.sh

# Expose only gateway port
EXPOSE 3000

# Start all services with coordinated startup
CMD ["./start.sh"]