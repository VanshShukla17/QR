# Database Backup and Export Procedure — QRaksha

**Standard:** ARCHITECTURE.md Section 5, 8, 13 & TASKS.md Phase 4  
**Applies to:** Supabase Postgres (Development, Staging, and Production Pilot environments)

---

## 1. Overview and Architecture

QRaksha uses Supabase hosted Postgres partitioned into three logical schemas:

1. `public`: General merchant directory (`public.merchant`) and admin user mapping (`public.admin_user`).
2. `identity`: Separately access-controlled identity data (`identity.merchant_identity` with GST/Udyam numbers, masked VPAs, KYC addresses).
3. `comparison`: Operational data (`merchant_credential`, `registered_qr`, `reference_embedding` with `pgvector`, `audit_run`, `blockchain_anchor`, `attestation_signal`, `dispute`).

While Supabase provides managed automated point-in-time backups on paid tiers, **this manual procedure ensures operations can independently snapshot, export, verify, and restore the complete system at any time**, especially before deploying major migrations or during pilot demo checkpoints.

---

## 2. Prerequisites

Ensure you have either the **Supabase CLI** or standard **PostgreSQL client tools** (`pg_dump`, `pg_restore`, `psql`) installed.

- **Supabase CLI:** `npm install -g supabase` or via package manager.
- **Postgres client tools:** `postgresql-client` (v15 or v16).
- **Environment variables:** Obtain the project reference and direct database connection string from your Supabase Dashboard:
  - Go to **Project Settings** → **Database** → **Connection String** → **URI**.
  - Format: `postgresql://postgres.[PROJECT_REF]:[YOUR_PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres`

---

## 3. Method A: Export via PostgreSQL CLI (`pg_dump`)

This is the recommended method for full-fidelity, compressed, and restorable snapshots.

### 3.1 Full Database Backup (Schema + Data + Policies)

Run the following command in a terminal (replace placeholders with your project details):

```bash
# Set connection variables
export DB_HOST="db.bzezpdhmdmftdzbldosv.supabase.co"
export DB_PORT="5432"
export DB_USER="postgres"
export DB_NAME="postgres"
export BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
export BACKUP_FILE="qraksha_backup_${BACKUP_DATE}.dump"

# Perform compressed custom-format dump
pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -F c \
  -b \
  -v \
  -f "$BACKUP_FILE"
```

### 3.2 Schema-Specific Backups

To create isolated backups for compliance (e.g. keeping operational comparison data separate from identity PII):

```bash
# 1. Operational Comparison Schema Only (Embeddings, Audits, Credentials)
pg_dump \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -n comparison \
  -F c -b -v \
  -f "qraksha_comparison_${BACKUP_DATE}.dump"

# 2. Identity Schema Only (Restricted PII)
pg_dump \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -n identity \
  -F c -b -v \
  -f "qraksha_identity_${BACKUP_DATE}.dump"

# 3. Public Schema Only
pg_dump \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -n public \
  -F c -b -v \
  -f "qraksha_public_${BACKUP_DATE}.dump"
```

### 3.3 Schema Definition Only (DDL without data)

```bash
pg_dump \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --schema-only \
  -f "qraksha_schema_ddl_${BACKUP_DATE}.sql"
```

---

## 4. Method B: Export via Supabase CLI

If using the Supabase CLI linked to your remote project:

```bash
# 1. Authenticate with Supabase
supabase login

# 2. Link your local repo to the remote project
supabase link --project-ref bzezpdhmdmftdzbldosv

# 3. Export Schema DDL
supabase db dump -f supabase/backups/schema_dump.sql

# 4. Export Table Data
supabase db dump --data-only -f supabase/backups/data_dump.sql
```

---

## 5. Backup Verification & Health Inspection

Before storing any backup, verify that the archive is valid and uncorrupted:

```bash
# List the contents of the custom-format dump
pg_restore -l "$BACKUP_FILE" | grep -E "TABLE DATA|ROW LEVEL SECURITY"

# Verify table presence in dump:
# Expected tables:
# - public.merchant
# - identity.merchant_identity
# - comparison.merchant_credential
# - comparison.registered_qr
# - comparison.reference_embedding
# - comparison.audit_run
# - comparison.blockchain_anchor
# - comparison.attestation_signal
# - comparison.dispute
```

---

## 6. Restoration & Disaster Recovery Procedure

To restore from a backup file into a fresh or recovered database:

### 6.1 Clean Restore (Custom format `.dump`)

```bash
# 1. Connect and ensure required extensions are active
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS vector;"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "CREATE SCHEMA IF NOT EXISTS identity; CREATE SCHEMA IF NOT EXISTS comparison;"

# 2. Restore all tables, indexes, and RLS policies
pg_restore \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  -v \
  "$BACKUP_FILE"
```

### 6.2 Post-Restoration Verification Checklist

Run these SQL sanity checks immediately after restoration:

```sql
-- 1. Verify row level security is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname IN ('identity', 'comparison', 'public');

-- 2. Verify record counts match pre-backup state
SELECT 'merchant' as tbl, count(*) FROM public.merchant
UNION ALL
SELECT 'merchant_identity', count(*) FROM identity.merchant_identity
UNION ALL
SELECT 'merchant_credential', count(*) FROM comparison.merchant_credential
UNION ALL
SELECT 'registered_qr', count(*) FROM comparison.registered_qr
UNION ALL
SELECT 'audit_run', count(*) FROM comparison.audit_run
UNION ALL
SELECT 'blockchain_anchor', count(*) FROM comparison.blockchain_anchor
UNION ALL
SELECT 'dispute', count(*) FROM comparison.dispute;

-- 3. Verify pgvector extension functionality
SELECT '[1,2,3]'::vector;
```

---

## 7. Security and Compliance for Backup Artifacts

1. **Never Commit Backups to Git:** Dump files (`*.dump`, `*.sql`, `supabase/backups/`) are strictly excluded by `.gitignore`.
2. **PII Protection:** Because `identity.merchant_identity` backups contain business identifiers (GST/Udyam numbers), all backup files must be encrypted with GPG or AES before archiving:
   ```bash
   gpg --symmetric --cipher-algo AES256 "$BACKUP_FILE"
   rm "$BACKUP_FILE"
   ```
3. **Retention:** Retain weekly snapshots for 30 days and pre-deployment snapshots for 90 days in encrypted cold storage.
