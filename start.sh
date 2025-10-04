#!/bin/sh

echo "Starting AetherConnect services..."

# Function to check if a service is ready
check_service_ready() {
    local port=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    echo "Waiting for $service_name to be ready on port $port..."

    while [ $attempt -le $max_attempts ]; do
        if nc -z localhost $port 2>/dev/null; then
            echo "✅ $service_name is ready on port $port"
            return 0
        fi

        echo "Attempt $attempt/$max_attempts: $service_name not ready yet, waiting..."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo "❌ $service_name failed to start on port $port"
    return 1
}

# Function to check gRPC service health
check_grpc_service() {
    local port=$1
    local service_name=$2
    local max_attempts=15
    local attempt=1

    echo "Checking gRPC health for $service_name on port $port..."

    while [ $attempt -le $max_attempts ]; do
        # Simple check - see if something is listening on the port
        if nc -z localhost $port 2>/dev/null; then
            echo "✅ $service_name gRPC service is responding on port $port"
            return 0
        fi

        echo "Attempt $attempt/$max_attempts: $service_name gRPC not ready yet, waiting..."
        sleep 3
        attempt=$((attempt + 1))
    done

    echo "❌ $service_name gRPC service failed to respond on port $port"
    return 1
}

echo "Setting up PM2 in production mode..."
export PM2_HOME=/tmp/pm2

# Start services with PM2 Runtime
echo "Starting all services with PM2..."
pm2-runtime start ecosystem.config.js --raw &

# Wait a moment for services to initialize
sleep 5

# Check if services are starting up
echo "Checking service startup status..."

# Check auth service gRPC
if ! check_grpc_service 50001 "Auth Service"; then
    echo "Auth Service failed to start properly"
    pm2 logs auth-service --lines 20
    exit 1
fi

# Check message service gRPC
if ! check_grpc_service 50002 "Message Service"; then
    echo "Message Service failed to start properly"
    pm2 logs message-service --lines 20
    exit 1
fi

# Check API gateway HTTP
if ! check_service_ready 3000 "API Gateway"; then
    echo "API Gateway failed to start properly"
    pm2 logs api-gateway --lines 20
    exit 1
fi

echo "🎉 All services started successfully!"
echo "🔗 API Gateway: http://localhost:3000"
echo "🔐 Auth Service (gRPC): localhost:50001"
echo "💬 Message Service (gRPC): localhost:50002"
echo "💬 Message Service (HTTP): localhost:3001"

# Keep the script running to maintain PM2 processes
wait
