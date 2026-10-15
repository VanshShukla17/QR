-- Migration: Create comparison.blockchain_anchor
-- Per ARCHITECTURE.md Section 4 & 5, and AGENTS.md Rule 9

CREATE TABLE IF NOT EXISTS comparison.blockchain_anchor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id UUID NOT NULL REFERENCES comparison.merchant_credential(id) ON DELETE RESTRICT,
    tx_hash VARCHAR(66),
    network VARCHAR(50) NOT NULL DEFAULT 'amoy',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'confirmed', 'failed')),
    credential_hash VARCHAR(66) NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    submitted_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for comparison.blockchain_anchor
CREATE INDEX IF NOT EXISTS idx_blockchain_anchor_credential_id 
    ON comparison.blockchain_anchor (credential_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_blockchain_anchor_tx_hash 
    ON comparison.blockchain_anchor (tx_hash) 
    WHERE tx_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_blockchain_anchor_status 
    ON comparison.blockchain_anchor (status);

-- Enable Row Level Security
ALTER TABLE comparison.blockchain_anchor ENABLE ROW LEVEL SECURITY;

-- RLS Policies:
-- 1. Public read access: Anyone (customers, merchants, auditors) can view on-chain proofs
CREATE POLICY "Public read for blockchain_anchor"
    ON comparison.blockchain_anchor
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 2. Service role full access: Backend API can create and update anchor attempts
CREATE POLICY "Service role full access on blockchain_anchor"
    ON comparison.blockchain_anchor
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
