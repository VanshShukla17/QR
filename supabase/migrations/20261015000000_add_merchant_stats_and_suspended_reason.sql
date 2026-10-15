-- Migration: 20261015000000_add_merchant_stats_and_suspended_reason.sql
-- Single Source of Truth for QRaksha Merchant Metrics & Suspended Verdict Reason
-- Per user directive and ARCHITECTURE.md Section 4 & 5

-- 1. Extend verdict_reason CHECK constraint on comparison.audit_run to allow CREDENTIAL_SUSPENDED
ALTER TABLE comparison.audit_run 
    DROP CONSTRAINT IF EXISTS audit_run_verdict_reason_check;

ALTER TABLE comparison.audit_run 
    ADD CONSTRAINT audit_run_verdict_reason_check 
    CHECK (verdict_reason IN ('OK', 'UNKNOWN_QR', 'LOCATION_MISMATCH', 'MISBINDING', 'CREDENTIAL_SUSPENDED'));

-- 2. Create canonical SQL function get_merchant_stats in comparison schema
-- Single source of truth for active QRs and clean audits:
-- Active QRs = registered_qr rows whose credential belongs to this merchant and has status 'active'
-- Clean Audits = audit_run rows for this merchant's credential with verdict_reason = 'OK', from both merchant audits and customer scans
CREATE OR REPLACE FUNCTION comparison.get_merchant_stats(p_merchant_id UUID)
RETURNS TABLE (
    active_qrs BIGINT,
    clean_audits BIGINT,
    total_audits BIGINT,
    flagged_audits BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Active QRs = registered_qr rows whose credential belongs to this merchant and has status 'active'
        COALESCE(
            (
                SELECT COUNT(rq.id)
                FROM comparison.registered_qr rq
                JOIN comparison.merchant_credential mc ON mc.id = rq.credential_id
                WHERE mc.merchant_id = p_merchant_id
                  AND mc.status = 'active'
            ), 0
        )::BIGINT AS active_qrs,

        -- Clean Audits = audit_run rows for this merchant's credential with verdict_reason = 'OK', from both merchant audits and customer scans
        COALESCE(
            (
                SELECT COUNT(ar.id)
                FROM comparison.audit_run ar
                JOIN comparison.merchant_credential mc ON mc.id = ar.credential_id
                WHERE mc.merchant_id = p_merchant_id
                  AND ar.verdict_reason = 'OK'
            ), 0
        )::BIGINT AS clean_audits,

        -- Total Audits for this merchant
        COALESCE(
            (
                SELECT COUNT(ar.id)
                FROM comparison.audit_run ar
                JOIN comparison.merchant_credential mc ON mc.id = ar.credential_id
                WHERE mc.merchant_id = p_merchant_id
            ), 0
        )::BIGINT AS total_audits,

        -- Flagged Audits for this merchant
        COALESCE(
            (
                SELECT COUNT(ar.id)
                FROM comparison.audit_run ar
                JOIN comparison.merchant_credential mc ON mc.id = ar.credential_id
                WHERE mc.merchant_id = p_merchant_id
                  AND ar.verdict = 'WARNING'
            ), 0
        )::BIGINT AS flagged_audits;
END;
$$;

GRANT EXECUTE ON FUNCTION comparison.get_merchant_stats(UUID) TO authenticated, anon, service_role;

-- 3. Public schema wrapper for RPC convenience
CREATE OR REPLACE FUNCTION public.get_merchant_stats(p_merchant_id UUID)
RETURNS TABLE (
    active_qrs BIGINT,
    clean_audits BIGINT,
    total_audits BIGINT,
    flagged_audits BIGINT
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT * FROM comparison.get_merchant_stats(p_merchant_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_merchant_stats(UUID) TO authenticated, anon, service_role;
