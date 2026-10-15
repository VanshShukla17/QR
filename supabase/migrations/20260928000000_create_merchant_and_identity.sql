-- Migration: Create public.merchant and identity.merchant_identity tables
-- Per ARCHITECTURE.md Section 4 & 5, and AGENTS.md Rule 9

-- 1. Create public.merchant table
CREATE TABLE IF NOT EXISTS public.merchant (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_merchant_contact_phone UNIQUE (contact_phone)
);

-- Index on contact_phone
CREATE INDEX IF NOT EXISTS idx_merchant_contact_phone ON public.merchant (contact_phone);

-- Enable RLS on public.merchant
ALTER TABLE public.merchant ENABLE ROW LEVEL SECURITY;

-- RLS policies for public.merchant:
CREATE POLICY "Merchant can view own record"
    ON public.merchant
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Merchant can insert own record"
    ON public.merchant
    FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

CREATE POLICY "Merchant can update own record"
    ON public.merchant
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Public read for merchant display"
    ON public.merchant
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Service role full access on public.merchant"
    ON public.merchant
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 2. Create identity.merchant_identity table
CREATE TABLE IF NOT EXISTS identity.merchant_identity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchant(id) ON DELETE RESTRICT,
    identity_tier VARCHAR(20) NOT NULL CHECK (identity_tier IN ('gst_verified', 'baseline')),
    gst_udyam_number VARCHAR(50),
    bank_vpa_masked VARCHAR(100),
    kyc_address TEXT NOT NULL,
    otp_confirmed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_merchant_identity_merchant_id UNIQUE (merchant_id),
    CONSTRAINT uq_merchant_identity_gst_udyam UNIQUE (gst_udyam_number)
);

-- Indexes for identity.merchant_identity
CREATE INDEX IF NOT EXISTS idx_merchant_identity_merchant_id ON identity.merchant_identity (merchant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_merchant_identity_gst_udyam ON identity.merchant_identity (gst_udyam_number) WHERE gst_udyam_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_merchant_identity_bank_vpa_masked ON identity.merchant_identity (bank_vpa_masked) WHERE identity_tier = 'baseline';

-- Enable RLS on identity.merchant_identity
ALTER TABLE identity.merchant_identity ENABLE ROW LEVEL SECURITY;

-- RLS policies for identity.merchant_identity per ARCHITECTURE.md Section 5:
CREATE POLICY "Owning merchant can view identity"
    ON identity.merchant_identity
    FOR SELECT
    TO authenticated
    USING (merchant_id = auth.uid());

CREATE POLICY "Owning merchant can insert identity"
    ON identity.merchant_identity
    FOR INSERT
    TO authenticated
    WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "Owning merchant can update identity"
    ON identity.merchant_identity
    FOR UPDATE
    TO authenticated
    USING (merchant_id = auth.uid())
    WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "Service role full access on identity.merchant_identity"
    ON identity.merchant_identity
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
