-- Migration: 20261014000001_create_merchant_tables.sql
-- Description: Create public.merchant and identity.merchant_identity tables with RLS and constraints

-- 1. Table: public.merchant
create table if not exists public.merchant (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  contact_phone text not null unique,
  created_at timestamptz not null default now()
);

-- Index on contact_phone
create index if not exists idx_merchant_contact_phone on public.merchant(contact_phone);

-- Enable RLS on public.merchant
alter table public.merchant enable row level security;

-- Policy: Authenticated users can read their own merchant record
create policy "Merchants can read own profile"
  on public.merchant
  for select
  using (auth.uid() = id);

-- Policy: Service role has full access
create policy "Service role has full access to merchant"
  on public.merchant
  for all
  using (auth.role() = 'service_role');


-- 2. Table: identity.merchant_identity
create table if not exists identity.merchant_identity (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchant(id) on delete restrict,
  identity_tier text not null check (identity_tier in ('gst_verified', 'baseline')),
  gst_udyam_number text unique,
  bank_vpa_masked text,
  kyc_address text not null,
  otp_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes on merchant_identity
create index if not exists idx_merchant_identity_merchant_id on identity.merchant_identity(merchant_id);
create unique index if not exists idx_merchant_identity_gst_udyam_number on identity.merchant_identity(gst_udyam_number) where gst_udyam_number is not null;

-- Enable RLS on identity.merchant_identity
alter table identity.merchant_identity enable row level security;

-- Policy: Only owning merchant can read their identity data
create policy "Merchants can read own identity"
  on identity.merchant_identity
  for select
  using (auth.uid() = merchant_id);

-- Policy: Service role has full access
create policy "Service role has full access to merchant_identity"
  on identity.merchant_identity
  for all
  using (auth.role() = 'service_role');

-- Explicitly comment on RLS and least-privilege boundary
comment on table identity.merchant_identity is 'Stores PII and verified identity documents. Restrictive RLS protects from admin/public inspection.';
