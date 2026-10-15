-- Migration: Create comparison.audit_run and comparison.attestation_signal
-- Per ARCHITECTURE.md Section 4 & 5, and AGENTS.md Rule 9

-- 1. Create comparison.attestation_signal table
CREATE TABLE IF NOT EXISTS comparison.attestation_signal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id UUID NOT NULL REFERENCES comparison.merchant_credential(id) ON DELETE RESTRICT,
    source_type VARCHAR(50) NOT NULL DEFAULT 'payer_scan',
    source_identifier_hash VARCHAR(64) NOT NULL,
    diversity_weight FLOAT NOT NULL DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for comparison.attestation_signal
CREATE INDEX IF NOT EXISTS idx_attestation_signal_credential_id 
    ON comparison.attestation_signal (credential_id);
CREATE INDEX IF NOT EXISTS idx_attestation_signal_source_hash 
    ON comparison.attestation_signal (source_identifier_hash);

-- Enable RLS on comparison.attestation_signal
ALTER TABLE comparison.attestation_signal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for attestation_signal"
    ON comparison.attestation_signal
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Service role full access on attestation_signal"
    ON comparison.attestation_signal
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 2. Create comparison.audit_run table
CREATE TABLE IF NOT EXISTS comparison.audit_run (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id UUID REFERENCES comparison.merchant_credential(id) ON DELETE RESTRICT,
    registered_qr_id UUID REFERENCES comparison.registered_qr(id) ON DELETE RESTRICT,
    initiated_by VARCHAR(30) NOT NULL DEFAULT 'merchant',
    verdict VARCHAR(30) NOT NULL 
        CHECK (verdict IN ('VERIFIED', 'RECENTLY_REGISTERED', 'WARNING')),
    verdict_reason VARCHAR(50) NOT NULL 
        CHECK (verdict_reason IN ('OK', 'UNKNOWN_QR', 'LOCATION_MISMATCH', 'MISBINDING')),
    agent_outputs JSONB NOT NULL DEFAULT '{}'::jsonb,
    degraded_check BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for comparison.audit_run per ARCHITECTURE.md Section 5
CREATE INDEX IF NOT EXISTS idx_audit_run_credential_created 
    ON comparison.audit_run (credential_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_run_verdict 
    ON comparison.audit_run (verdict);

-- Enable RLS on comparison.audit_run
ALTER TABLE comparison.audit_run ENABLE ROW LEVEL SECURITY;

-- RLS policies for comparison.audit_run:
-- Public can read audit runs for verification/audit transparency
CREATE POLICY "Public read for audit_run"
    ON comparison.audit_run
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Service role full access to insert audit records (append-only)
CREATE POLICY "Service role full access on audit_run"
    ON comparison.audit_run
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
