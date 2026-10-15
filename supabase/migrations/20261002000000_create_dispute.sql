-- Migration: Create comparison.dispute
-- Per ARCHITECTURE.md Section 5, PRD.md Section 4, and AGENTS.md Rule 9

CREATE TABLE IF NOT EXISTS comparison.dispute (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id UUID NOT NULL REFERENCES comparison.merchant_credential(id) ON DELETE RESTRICT,
    filed_by_merchant_id UUID REFERENCES identity.merchant_identity(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'open' 
        CHECK (status IN ('open', 'resolved_upheld', 'resolved_rejected')),
    evidence_summary TEXT NOT NULL,
    resolved_by_admin_id UUID,
    resolution_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    CONSTRAINT chk_dispute_resolution_reason 
        CHECK (status = 'open' OR (resolution_reason IS NOT NULL AND resolved_at IS NOT NULL))
);

-- Index on (credential_id, status) for open-disputes queue per ARCHITECTURE.md Section 5
CREATE INDEX IF NOT EXISTS idx_dispute_credential_status 
    ON comparison.dispute (credential_id, status);

CREATE INDEX IF NOT EXISTS idx_dispute_status_created_at 
    ON comparison.dispute (status, created_at DESC);

-- Enable Row Level Security
ALTER TABLE comparison.dispute ENABLE ROW LEVEL SECURITY;

-- Merchants can view their filed disputes
CREATE POLICY "Merchants can view their filed disputes"
    ON comparison.dispute
    FOR SELECT
    TO authenticated
    USING (filed_by_merchant_id = auth.uid());

-- Service role has full access
CREATE POLICY "Service role full access on dispute"
    ON comparison.dispute
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
