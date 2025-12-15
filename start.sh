#!/bin/bash

# Tazama Start Script
# Starts all services using docker-compose

set -e

echo "=========================================="
echo "Starting Tazama Services"
echo "=========================================="
echo ""

# Check if .env exists, if not copy from .env.example
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please review and update .env file with your configuration"
    echo ""
fi

# Check if services directory exists
if [ ! -d "services" ]; then
    echo "❌ Services directory not found!"
    echo "Please run ./setup.sh first to clone all repositories"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo "Please start Docker and try again"
    exit 1
fi

echo "🚀 Starting infrastructure services (NATS, PostgreSQL, Valkey)..."
docker-compose up -d nats postgres valkey

echo "⏳ Waiting for infrastructure services to be ready..."
sleep 10

echo "🚀 Starting core services..."
docker-compose up -d admin-service tms-service event-director

echo "⏳ Waiting for core services to be ready..."
sleep 5

echo "🚀 Starting rule processors..."
docker-compose up -d rule-901 event-flow

echo "⏳ Waiting for rule processors to be ready..."
sleep 5

echo "🚀 Starting typology processor and TADP..."
docker-compose up -d typology-processor tadp

echo "⏳ Waiting for processors to be ready..."
sleep 5

echo "🚀 Starting relay service..."
docker-compose up -d relay-service

echo ""
echo "=========================================="
echo "✅ All services started!"
echo "=========================================="
echo ""
echo "Service URLs:"
echo "  📊 Admin Service:    http://localhost:3100"
echo "  💳 TMS Service:      http://localhost:3000"
echo "  📡 NATS Monitor:     http://localhost:8222"
echo "  🐘 PostgreSQL:       localhost:5432"
echo "  🔴 Valkey (Redis):   localhost:6379"
echo ""
echo "Check service status:"
echo "  docker-compose ps"
echo ""
echo "View logs:"
echo "  docker-compose logs -f [service-name]"
echo "  docker-compose logs -f tms-service"
echo ""
echo "Stop all services:"
echo "  ./stop.sh"
echo ""
