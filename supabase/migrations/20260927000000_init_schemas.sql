-- Initial Supabase migration for QRaksha
-- Creates the isolated 'identity' and 'comparison' schemas per ARCHITECTURE.md Section 2, 4, 5

CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS comparison;

-- Enable pgvector for visual embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Grant usage on schemas to authenticated, anon, and service_role
GRANT USAGE ON SCHEMA identity TO authenticated, anon, service_role;
GRANT USAGE ON SCHEMA comparison TO authenticated, anon, service_role;
