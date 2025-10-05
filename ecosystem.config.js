module.exports = {
  apps: [
    {
      name: "auth-service",
      script: "node",
      args: "dist/main.js",
      cwd: "./services/auth-service-nestjs",
      env: {
        ...process.env,
        NODE_ENV: "production",
        AUTH_SERVICE_GRPC_PORT: process.env.AUTH_SERVICE_GRPC_PORT || 50001,
        AUTH_SERVICE_HTTP_PORT: process.env.AUTH_SERVICE_HTTP_PORT || 3002,
      },
    },
    {
      name: "message-service",
      script: "node",
      args: "dist/main.js",
      cwd: "./services/message-service",
      env: {
        ...process.env,
        NODE_ENV: "production",
        GRPC_PORT: process.env.MESSAGE_SERVICE_GRPC_PORT || 50002,
        HTTP_PORT: process.env.MESSAGE_SERVICE_HTTP_PORT || 3001,
      },
    },
    {
      name: "api-gateway",
      script: "node",
      args: "dist/main.js",
      cwd: "./services/api-gateway",
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: process.env.API_GATEWAY_PORT || 3000,
        AUTH_SERVICE_GRPC_URL: process.env.AUTH_SERVICE_GRPC_URL || "localhost:50001",
        MESSAGE_SERVICE_GRPC_URL: process.env.MESSAGE_SERVICE_GRPC_URL || "localhost:50002",
        FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3004",
      },
      wait_ready: true,
      listen_timeout: 15000,
      start_delay: 10000,
      kill_timeout: 5000,
      restart_delay: 4000,
      max_restarts: 5,
      min_uptime: "10s",
    },
  ],
};
