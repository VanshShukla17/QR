-- Migration: Create comparison.merchant_credential, comparison.registered_qr, comparison.reference_embedding
-- Per ARCHITECTURE.md Section 4 & 5, and AGENTS.md Rule 9

-- Ensure vector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Create comparison.merchant_credential table
CREATE TABLE IF NOT EXISTS comparison.merchant_credential (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchant(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending_activation' 
        CHECK (status IN ('pending_activation', 'recently_registered', 'active', 'suspended')),
    trust_tier VARCHAR(20) NOT NULL DEFAULT 'unverified' 
        CHECK (trust_tier IN ('verified', 'unverified', 'warning')),
    trust_score FLOAT NOT NULL DEFAULT 0.0,
    location_variance BOOLEAN NOT NULL DEFAULT false,
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for comparison.merchant_credential
CREATE INDEX IF NOT EXISTS idx_merchant_credential_merchant_id ON comparison.merchant_credential (merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_credential_trust_tier ON comparison.merchant_credential (trust_tier);

-- Enable RLS on comparison.merchant_credential
ALTER TABLE comparison.merchant_credential ENABLE ROW LEVEL SECURITY;

-- RLS policies for comparison.merchant_credential:
CREATE POLICY "Merchant can view own credential"
    ON comparison.merchant_credential
    FOR SELECT
    TO authenticated
    USING (merchant_id = auth.uid());

CREATE POLICY "Merchant can insert own credential"
    ON comparison.merchant_credential
    FOR INSERT
    TO authenticated
    WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "Merchant can update own credential"
    ON comparison.merchant_credential
    FOR UPDATE
    TO authenticated
    USING (merchant_id = auth.uid())
    WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "Public read for merchant credential"
    ON comparison.merchant_credential
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Service role full access on merchant_credential"
    ON comparison.merchant_credential
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 2. Create comparison.registered_qr table
CREATE TABLE IF NOT EXISTS comparison.registered_qr (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id UUID NOT NULL REFERENCES comparison.merchant_credential(id) ON DELETE RESTRICT,
    qr_payload_hash VARCHAR(64) NOT NULL,
    bound_lat DOUBLE PRECISION NOT NULL,
    bound_lng DOUBLE PRECISION NOT NULL,
    bound_radius_m INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_registered_qr_payload_hash UNIQUE (qr_payload_hash)
);

-- Indexes for comparison.registered_qr
CREATE UNIQUE INDEX IF NOT EXISTS idx_registered_qr_payload_hash ON comparison.registered_qr (qr_payload_hash);
CREATE INDEX IF NOT EXISTS idx_registered_qr_credential_id ON comparison.registered_qr (credential_id);

-- Enable RLS on comparison.registered_qr
ALTER TABLE comparison.registered_qr ENABLE ROW LEVEL SECURITY;

-- RLS policies for comparison.registered_qr:
CREATE POLICY "Public read for registered_qr"
    ON comparison.registered_qr
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Service role full access on registered_qr"
    ON comparison.registered_qr
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 3. Create comparison.reference_embedding table
CREATE TABLE IF NOT EXISTS comparison.reference_embedding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registered_qr_id UUID NOT NULL REFERENCES comparison.registered_qr(id) ON DELETE RESTRICT,
    embedding vector(768) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_reference_embedding_qr_id UNIQUE (registered_qr_id)
);

-- Indexes for comparison.reference_embedding
CREATE INDEX IF NOT EXISTS idx_reference_embedding_qr_id ON comparison.reference_embedding (registered_qr_id);

-- Enable RLS on comparison.reference_embedding
ALTER TABLE comparison.reference_embedding ENABLE ROW LEVEL SECURITY;

-- RLS policies for comparison.reference_embedding:
CREATE POLICY "Service role full access on reference_embedding"
    ON comparison.reference_embedding
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
