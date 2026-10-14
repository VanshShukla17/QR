-- QRaksha Initial Schema Migration
-- Creates identity and comparison schemas with pgvector extension

-- Enable pgvector extension for vision embeddings
create extension if not exists vector with schema public;

-- Create separated schemas per ARCHITECTURE.md Section 5
create schema if not exists identity;
create schema if not exists comparison;

-- Comment on schemas explaining architectural separation
comment on schema identity is 'Sensitive merchant identity data (GST/Udyam, bank VPAs), restricted by RLS';
comment on schema comparison is 'Operational and verification data (credentials, embeddings, audit runs, blockchain anchors)';
