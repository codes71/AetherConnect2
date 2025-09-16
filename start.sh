#!/bin/sh

echo "Starting AetherConnect services..."

# Start all services with PM2
pm2-runtime start ecosystem.config.js