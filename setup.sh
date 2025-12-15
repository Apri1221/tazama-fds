#!/usr/bin/env bash

# Tazama Setup Script
# This script clones all required repositories for the Tazama transaction monitoring system

set -e

echo "=========================================="
echo "Tazama Setup Script"
echo "=========================================="
echo ""

# Create services directory
echo "Creating services directory..."
mkdir -p services
cd services

# Clone each repository
clone_repo() {
    local service=$1
    local url=$2
    
    if [ -d "$service" ]; then
        echo "⚠️  $service already exists, skipping..."
    else
        echo "📦 Cloning $service..."
        git clone "$url" "$service"
        echo "✅ $service cloned successfully"
    fi
    echo ""
}

# Clone all repositories
clone_repo "admin-service" "https://github.com/tazama-lf/admin-service"
clone_repo "tms-service" "https://github.com/tazama-lf/tms-service"
clone_repo "event-director" "https://github.com/tazama-lf/event-director"
clone_repo "rule-executer" "https://github.com/tazama-lf/rule-executer"
clone_repo "typology-processor" "https://github.com/tazama-lf/typology-processor"
clone_repo "transaction-aggregation-decisioning-processor" "https://github.com/tazama-lf/transaction-aggregation-decisioning-processor"
clone_repo "event-flow" "https://github.com/tazama-lf/event-flow"
clone_repo "relay-service" "https://github.com/tazama-lf/relay-service"

cd ..

# Create Dockerfiles for each service if they don't exist
echo "=========================================="
echo "Creating Dockerfiles for services..."
echo "=========================================="
echo ""

create_dockerfile() {
    local service=$1
    local DOCKERFILE="services/$service/Dockerfile"
    
    if [ ! -f "$DOCKERFILE" ]; then
        echo "Creating Dockerfile for $service..."
        cat > "$DOCKERFILE" << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build if TypeScript project
RUN if [ -f "tsconfig.json" ]; then npm run build || true; fi

# Expose port (will be overridden by docker-compose)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
EOF
        echo "✅ Dockerfile created for $service"
    else
        echo "⚠️  Dockerfile already exists for $service"
    fi
}

# Create Dockerfiles
create_dockerfile "admin-service"
create_dockerfile "tms-service"
create_dockerfile "event-director"
create_dockerfile "rule-executer"
create_dockerfile "typology-processor"
create_dockerfile "transaction-aggregation-decisioning-processor"
create_dockerfile "event-flow"
create_dockerfile "relay-service"

echo ""
echo "=========================================="
echo "Creating database initialization scripts..."
echo "=========================================="
mkdir -p init-db

cat > init-db/01-init.sql << 'EOF'
-- Tazama Database Initialization
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create basic tables (these may be extended by individual services)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id VARCHAR(255) UNIQUE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(18, 2),
    currency VARCHAR(3),
    debtor_account VARCHAR(255),
    creditor_account VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id),
    message_id VARCHAR(255) NOT NULL,
    overall_score DECIMAL(5, 2),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS typology_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_id UUID REFERENCES evaluations(id),
    typology_id VARCHAR(100) NOT NULL,
    typology_score DECIMAL(5, 2),
    threshold_breach BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rule_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    typology_result_id UUID REFERENCES typology_results(id),
    rule_id VARCHAR(100) NOT NULL,
    rule_result BOOLEAN,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_transactions_message_id ON transactions(message_id);
CREATE INDEX idx_evaluations_message_id ON evaluations(message_id);
CREATE INDEX idx_evaluations_transaction_id ON evaluations(transaction_id);
CREATE INDEX idx_typology_results_evaluation_id ON typology_results(evaluation_id);
CREATE INDEX idx_rule_results_typology_result_id ON rule_results(typology_result_id);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
EOF

echo "✅ Database initialization script created"
echo ""

echo "=========================================="
echo "Setup Complete! 🎉"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Review and customize environment variables in docker-compose.yml"
echo "2. Run: ./start.sh to start all services"
echo "3. Access admin service at: http://localhost:3100"
echo "4. Access TMS service at: http://localhost:3000"
echo ""
echo "For more information, see SETUP.md"
