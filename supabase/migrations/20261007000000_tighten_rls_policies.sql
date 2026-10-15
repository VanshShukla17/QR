-- Migration: Tighten RLS policies on comparison.merchant_credential
-- Per ARCHITECTURE.md Section 5 and AGENTS.md Rule 8
-- Drops public/anon read policy from merchant_credential so only authenticated owning merchants
-- (via merchant_id = auth.uid()) and backend service_role have access.

DROP POLICY IF EXISTS "Public read for merchant credential" ON comparison.merchant_credential;
