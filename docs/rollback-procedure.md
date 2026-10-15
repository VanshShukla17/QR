# Production Rollback Procedure & Rehearsal Runbook

This runbook documents the disaster recovery and emergency rollback protocols for QRaksha, fulfilling **`ARCHITECTURE.md` Section 13** and **TASKS.md Task 9**.

---

## 1. Rollback Decision Framework

A rollback must be initiated immediately if any of the following P1 incidents occur following a deployment:

| Trigger Condition                 | Threshold                                                      | Action                         |
| --------------------------------- | -------------------------------------------------------------- | ------------------------------ |
| **Elevated 🔴 WARNING Rate**      | > 15% WARNING verdicts on previously verified demo merchants   | Instant rollback backend       |
| **API 500 Internal Errors**       | > 1% HTTP 5xx errors on `/api/v1/audit/run` or `/api/v1/check` | Instant rollback backend       |
| **Frontend White Screen / Crash** | Sentry client unhandled exception spike                        | Instant rollback frontend      |
| **Blockchain Anchoring Stoppage** | Anchoring queue accumulating 5 consecutive failures            | Degrade anchoring, investigate |
| **Latency SLA Breach**            | p95 verdict calculation latency > 3,000ms                      | Rollback backend               |

---

## 2. Recovery Time Objective (RTO) & Targets

- **Frontend Rollback RTO:** < 30 seconds (instant DNS alias repoint on Vercel Edge)
- **Backend Rollback RTO:** < 90 seconds (instant image cutover on Render)
- **Data Loss:** 0 (database migrations are strictly non-destructive and backward-compatible)

---

## 3. Tier 1: Frontend Instant Rollback (Vercel)

Vercel preserves immutable deployment artifacts for every build.

### Method A: Vercel Dashboard

1. Open [vercel.com/qraksha/web/deployments](https://vercel.com).
2. Locate the previous stable deployment (marked `Ready`).
3. Click the three dots (`...`) → **Instant Rollback**.
4. Confirm rollback. Traffic routes to the prior build within ~10 seconds.

### Method B: Vercel CLI

```bash
# Rollback production domain to previous deployment URL
npx vercel rollback --prod --yes
```

---

## 4. Tier 2: Backend Service Rollback (Render)

Render maintains immutable container images and build caches for every release commit.

### Method A: Render Dashboard

1. Open [dashboard.render.com](https://dashboard.render.com).
2. Select `qraksha-api-prod`.
3. Go to the **Deploys** tab.
4. Locate the last known good deployment.
5. Click **Redeploy this commit**.

### Method B: Git Trunk Rollback

```bash
# Revert the faulty commit on main
git revert HEAD -m 1 --no-edit
git push origin main
```

Approve the manual deployment gate on Render for `qraksha-api-prod`.

---

## 5. Tier 3: Database Backward-Compatibility Assurance

Per **`ARCHITECTURE.md` Section 13**:

> "Database migrations are written to be additive/backward-compatible where possible so a frontend rollback never requires a matching destructive schema rollback."

### Rules Enforced:

1. **Never drop columns in active use:** Columns are marked deprecated before removal.
2. **New columns must have default values or be nullable:** Ensuring previous backend binaries continue to execute without `NOT NULL` constraint violations.
3. **Idempotent RLS Policies:** Policies use `CREATE POLICY ...` or `DROP POLICY IF EXISTS ...` ensuring clean replay.
4. **No Destructive Rollback:** If a backend release is rolled back, the existing database schema remains compatible with the previous application build.

---

## 6. Tier 4: Blockchain Testnet State Safety

The blockchain anchoring pipeline is **idempotent**:

- Every anchor job hashes the canonical credential metadata.
- If a deployment is rolled back, pending jobs in `comparison.blockchain_anchor` are re-processed or held safely.
- No duplicate on-chain transactions are created for identical canonical hashes.

---

## 7. Rehearsal Verification Drill

To rehearse the rollback drill in automated staging:

```bash
npm run rehearse:rollback --workspace=apps/api
```
