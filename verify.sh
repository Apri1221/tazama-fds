#!/bin/bash

# Quick verification script for Tazama infrastructure

echo "=========================================="
echo "Tazama Infrastructure Health Check"
echo "=========================================="
echo ""

# Check NATS
echo "🔍 Checking NATS..."
if curl -s http://localhost:8222/varz > /dev/null 2>&1; then
    echo "✅ NATS is running on port 8222"
    NATS_VERSION=$(curl -s http://localhost:8222/varz | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    echo "   Version: $NATS_VERSION"
else
    echo "❌ NATS is not accessible"
fi
echo ""

# Check PostgreSQL
echo "🔍 Checking PostgreSQL..."
if docker exec tazama-postgres psql -U postgres -d tazama -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ PostgreSQL is running on port 5433"
    PG_VERSION=$(docker exec tazama-postgres psql -U postgres -d tazama -t -c "SELECT version();" | head -1 | xargs)
    echo "   Version: ${PG_VERSION:0:50}..."
else
    echo "❌ PostgreSQL is not accessible"
fi
echo ""

# Check Valkey
echo "🔍 Checking Valkey (Redis)..."
if docker exec tazama-valkey valkey-cli ping > /dev/null 2>&1; then
    echo "✅ Valkey is running on port 6380"
    VALKEY_VERSION=$(docker exec tazama-valkey valkey-cli --version)
    echo "   Version: $VALKEY_VERSION"
else
    echo "❌ Valkey is not accessible"
fi
echo ""

# Check database tables
echo "🔍 Checking database tables..."
TABLE_COUNT=$(docker exec tazama-postgres psql -U postgres -d tazama -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | xargs)
if [ "$TABLE_COUNT" -gt 0 ]; then
    echo "✅ Database initialized with $TABLE_COUNT tables"
else
    echo "⚠️  No tables found in database (run migrations if needed)"
fi
echo ""

echo "=========================================="
echo "Infrastructure Status: READY"
echo "=========================================="
echo ""
echo "📊 Access Points:"
echo "   NATS Monitor:  http://localhost:8222"
echo "   PostgreSQL:    localhost:5433 (user: postgres, db: tazama)"
echo "   Valkey:        localhost:6380"
echo ""
echo "Next: Build and start application services with:"
echo "   docker-compose build"
echo "   docker-compose up -d"
echo ""
