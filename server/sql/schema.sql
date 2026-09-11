-- SQL Schema for Smart Campus Visitor Management System (Supabase PostgreSQL)

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table 1: visitor_tokens
CREATE TABLE IF NOT EXISTS visitor_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_code VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE', -- 'AVAILABLE' | 'IN USE'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: visits
CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_id UUID REFERENCES visitor_tokens(id) ON DELETE CASCADE,
    token_code VARCHAR(50) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    purpose TEXT NOT NULL,
    expected_duration VARCHAR(50) NOT NULL,
    check_in TIMESTAMPTZ DEFAULT NOW(),
    check_out TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE' | 'COMPLETED'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_tokens_code ON visitor_tokens(token_code);
CREATE INDEX IF NOT EXISTS idx_visits_token_code ON visits(token_code);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
