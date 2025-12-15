-- Tazama Database Initialization
-- Create extension in default database first
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create all required databases
CREATE DATABASE configuration;
CREATE DATABASE event_history;
CREATE DATABASE evaluation;
CREATE DATABASE transaction_history;
CREATE DATABASE pseudonyms;
CREATE DATABASE raw_history;

-- Connect to transaction_history database and create tables
\c transaction_history;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Connect to evaluation database and create tables
\c evaluation;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID,
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
    typology_result_id UUID,
    rule_id VARCHAR(100) NOT NULL,
    rule_result BOOLEAN,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_evaluations_message_id ON evaluations(message_id);
CREATE INDEX IF NOT EXISTS idx_typology_results_evaluation_id ON typology_results(evaluation_id);

-- Grant permissions on all databases
\c configuration;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

\c event_history;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

\c evaluation;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

\c transaction_history;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

\c pseudonyms;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
