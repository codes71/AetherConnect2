module.exports = {
  apps: [
    {
      name: 'auth-service',
      cwd: './services/auth-service-nestjs',
      script: 'npm',
      args: 'start',
      env: {
        PORT: 3001,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'message-service', 
      cwd: './services/message-service',
      script: 'npm',
      args: 'start',
      env: {
        PORT: 3002,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'api-gateway',
      cwd: './services/api-gateway', 
      script: 'npm',
      args: 'start',
      env: {
        PORT: 3000,
        NODE_ENV: 'production'
      }
    }
  ]
};
