# Production (Pilot) Deployment Runbook & Operational Architecture

This runbook documents the deployment, release governance, and post-deployment verification procedures for the **QRaksha Production (Pilot) Environment**, strictly adhering to **`ARCHITECTURE.md` Section 13**.

---

## 1. Production Architecture Overview

The production pilot architecture is engineered for low latency, zero-credential leakage, and high reliability:

```mermaid
flowchart TD
    subgraph Production Client
        VercelProd[Vercel Production Deploy<br/>https://qraksha.vercel.app]
    end

    subgraph Production Backend
        RenderProd[Render Web Service (Manual Gated)<br/>https://qraksha-api-prod.onrender.com]
    end

    subgraph Production Data
        SupaProd[(Supabase Production Project<br/>Postgres + RLS + pgvector)]
    end

    subgraph Production External
        GeminiProd[Google Gemini API<br/>Dedicated Production Tier Key]
        AmoyProd[Polygon Amoy Testnet<br/>Monitored Dedicated Pilot Wallet]
        SentryProd[Sentry Error Tracking<br/>Environment: 'production']
    end

    VercelProd -->|HTTPS/CORS| RenderProd
    RenderProd -->|Service Role (Server Only)| SupaProd
    RenderProd --> GeminiProd
    RenderProd --> AmoyProd
    RenderProd --> SentryProd
    VercelProd --> SentryProd
```

---

## 2. Release Governance & Deployment Gate

Per **`ARCHITECTURE.md` Section 13**:

- **Frontend (Vercel):** Merges to `main` automatically build and deploy to production edge network.
- **Backend (Render):** Backend deploys are **manual-approval-gated** (`autoDeploy: false` in [`render.yaml`](../render.yaml)).
  - _Rationale:_ The backend controls database migrations and blockchain transactions. Requiring manual approval prevents unscheduled schema lock-outs or schema migrations from running before operational review.

---

## 3. Pre-Flight Verification Checklist

Before triggering a production deployment, run all automated readiness audits:

```bash
# 1. Typecheck and unit/integration test suites
npm run typecheck --workspaces
npm run test --workspaces

# 2. Production readiness audit
npm run verify:prod --workspace=apps/api

# 3. Security checklist audit
npm run verify:security --workspace=apps/api

# 4. Blockchain testnet wallet balance audit
npm run verify:wallet --workspace=apps/api

# 5. Production bundle build
npm run build --workspaces
```

---

## 4. Step-by-Step Deployment Procedure

### Step 1: Database Migration Deployment

1. Link to the production Supabase project:
   ```bash
   npx supabase link --project-ref <production-project-ref>
   ```
2. Apply the migration suite:
   ```bash
   npx supabase db push
   ```
3. Run the automated RLS policy audit against the target database:
   ```bash
   npm run db:verify-staging --workspace=apps/api
   ```

### Step 2: Backend Service Cutover (Render)

1. Open the [Render Dashboard](https://dashboard.render.com).
2. Navigate to `qraksha-api-prod`.
3. Click **Manual Deploy** → **Deploy latest commit**.
4. Monitor the deployment build log:
   - Verifies `npm install && npm run build --workspace=apps/api`
   - Starts service: `node apps/api/dist/index.js`
   - Waits for health-check probe: `GET /api/v1/health` returning HTTP 200.

### Step 3: Frontend Edge Deployment (Vercel)

1. Vercel automatically deploys the commit on `main`.
2. Inspect deployment preview at `https://qraksha.vercel.app`.
3. Confirm CSP and security headers:
   ```bash
   curl -I https://qraksha.vercel.app
   ```

---

## 5. Post-Deployment Smoke Verification

Execute the following smoke tests against production endpoints:

| Step | Action                                                     | Expected Outcome                                                  |
| ---- | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| 1    | `curl https://qraksha-api-prod.onrender.com/api/v1/health` | HTTP 200, `status: "healthy"`                                     |
| 2    | Visit `https://qraksha.vercel.app/`                        | Landing page renders 10-section layout, Three.js hero, and ticker |
| 3    | Visit `https://qraksha.vercel.app/check`                   | Camera viewfinder opens with scan guidance                        |
| 4    | Visit `/verify/<credentialId>`                             | Canonical hash & PolygonScan explorer deep link render            |
