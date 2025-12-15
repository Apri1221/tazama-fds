#!/bin/bash

# Tazama Stop Script
# Stops all services

set -e

echo "=========================================="
echo "Stopping Tazama Services"
echo "=========================================="
echo ""

echo "🛑 Stopping all services..."
docker-compose down

echo ""
echo "✅ All services stopped"
echo ""
echo "To remove all data (including database):"
echo "  docker-compose down -v"
echo ""
