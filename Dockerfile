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
RUN cd packages/shared && pnpm run build
RUN cd services/auth-service-nestjs && pnpm run build
RUN cd services/message-service && pnpm run build  
RUN cd services/api-gateway && pnpm run build

# Create PM2 ecosystem file
COPY ecosystem.config.js ./

# Expose only gateway port
EXPOSE 3000

# Start all services with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
