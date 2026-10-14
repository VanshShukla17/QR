-- Migration: 20261014000002_create_comparison_tables.sql
-- Description: Create comparison.merchant_credential, comparison.registered_qr, and comparison.reference_embedding with pgvector

-- Ensure pgvector extension is enabled
create extension if not exists vector with schema public;

-- 1. Table: comparison.merchant_credential
create table if not exists comparison.merchant_credential (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchant(id) on delete restrict,
  status text not null check (status in ('pending_activation', 'recently_registered', 'active', 'suspended')) default 'pending_activation',
  trust_tier text not null check (trust_tier in ('verified', 'unverified', 'warning')) default 'unverified',
  trust_score double precision not null default 0.0,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for comparison.merchant_credential
create index if not exists idx_merchant_credential_merchant_id on comparison.merchant_credential(merchant_id);
create index if not exists idx_merchant_credential_trust_tier on comparison.merchant_credential(trust_tier);

-- Enable RLS on comparison.merchant_credential
alter table comparison.merchant_credential enable row level security;

-- Policy: Owning merchant can read their credential
create policy "Merchants can read own credential"
  on comparison.merchant_credential
  for select
  using (auth.uid() = merchant_id);

-- Policy: Owning merchant can update their credential
create policy "Merchants can update own credential"
  on comparison.merchant_credential
  for update
  using (auth.uid() = merchant_id);

-- Policy: Service role has full access
create policy "Service role has full access to merchant_credential"
  on comparison.merchant_credential
  for all
  using (auth.role() = 'service_role');


-- 2. Table: comparison.registered_qr
create table if not exists comparison.registered_qr (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid not null references comparison.merchant_credential(id) on delete restrict,
  qr_payload_hash text not null unique,
  bound_lat double precision not null,
  bound_lng double precision not null,
  bound_radius_m integer not null default 100,
  location_variance boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes for comparison.registered_qr
create unique index if not exists idx_registered_qr_payload_hash on comparison.registered_qr(qr_payload_hash);
create index if not exists idx_registered_qr_credential_id on comparison.registered_qr(credential_id);

-- Enable RLS on comparison.registered_qr
alter table comparison.registered_qr enable row level security;

-- Policy: Merchants can read registered QRs belonging to their credentials
create policy "Merchants can read own registered QRs"
  on comparison.registered_qr
  for select
  using (
    exists (
      select 1 from comparison.merchant_credential mc
      where mc.id = credential_id and mc.merchant_id = auth.uid()
    )
  );

-- Policy: Service role has full access
create policy "Service role has full access to registered_qr"
  on comparison.registered_qr
  for all
  using (auth.role() = 'service_role');


-- 3. Table: comparison.reference_embedding
create table if not exists comparison.reference_embedding (
  id uuid primary key default gen_random_uuid(),
  registered_qr_id uuid not null unique references comparison.registered_qr(id) on delete restrict,
  embedding vector(768) not null,
  created_at timestamptz not null default now()
);

-- Indexes for comparison.reference_embedding
create unique index if not exists idx_reference_embedding_registered_qr_id on comparison.reference_embedding(registered_qr_id);
create index if not exists idx_reference_embedding_cosine on comparison.reference_embedding using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Enable RLS on comparison.reference_embedding
alter table comparison.reference_embedding enable row level security;

-- Policy: Merchants can read embeddings belonging to their registered QRs
create policy "Merchants can read own reference embeddings"
  on comparison.reference_embedding
  for select
  using (
    exists (
      select 1 from comparison.registered_qr rq
      join comparison.merchant_credential mc on mc.id = rq.credential_id
      where rq.id = registered_qr_id and mc.merchant_id = auth.uid()
    )
  );

-- Policy: Service role has full access
create policy "Service role has full access to reference_embedding"
  on comparison.reference_embedding
  for all
  using (auth.role() = 'service_role');

-- Storage bucket for transient uploads (photo buffer)
insert into storage.buckets (id, name, public)
values ('transient-uploads', 'transient-uploads', false)
on conflict (id) do nothing;
