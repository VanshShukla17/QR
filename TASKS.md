# TASKS.md — QRaksha

## Critical Execution Rule

Every coding session on this repository must, in order:

1. Read `AGENTS.md`
2. Read `PRD.md`
3. Read `ARCHITECTURE.md`
4. Read `TASKS.md`
5. Identify the **first incomplete task** (top-to-bottom, first unchecked box)
6. Work ONLY on that task
7. Run the relevant checks (`typecheck`, `lint`, relevant tests — see `AGENTS.md` Section 4)
8. Review the implementation against the task's "Done when" criteria
9. Update the task's checkbox(es) in this file
10. Update `PRD.md`/`ARCHITECTURE.md` if the implementation required an architectural decision not already documented
11. Stop and wait for review before beginning any unrelated task

Do not skip ahead. Do not batch multiple unrelated tasks into one session.

---

## Phase 0 — Planning

- [x] Validate product assumptions in `PRD.md` (identity-tier ramp speeds, trust-score formula, location-radius default) against the team's actual hackathon judging/demo constraints
- [x] Review `PRD.md` in full with all contributors
- [x] Review `ARCHITECTURE.md` in full, confirm the monorepo layout assumption is acceptable
- [x] Confirm the stack choices in `ARCHITECTURE.md` Section 2 (no substitutions without updating the document)
- [x] Confirm the data model in `ARCHITECTURE.md` Section 4 (entity list and relationships)
- [x] Confirm the API contract in `ARCHITECTURE.md` Section 6 (route list and conventions)

## Phase 1 — Project Setup

- [x] Initialize git repository, default branch `main`, add `.gitignore` (node_modules, `.env*`, build artifacts)
- [x] Initialize npm workspaces root `package.json` with `apps/web`, `apps/api`, `packages/shared`
- [x] Scaffold `apps/web` with Next.js (TypeScript template)
- [x] Scaffold `apps/api` with Express (TypeScript)
- [x] Scaffold `packages/shared` with a `tsconfig.json` and an initial `zod` schema file
- [x] Configure TypeScript project references across the three workspaces
- [x] Add `.env.example` files to `apps/web` and `apps/api` listing every variable named in `ARCHITECTURE.md` Section 13 (no real values)
- [x] Configure Prettier at the repo root, shared across workspaces
- [x] Configure ESLint at the repo root with a TypeScript config, extended per-workspace as needed
- [x] Configure Vitest for unit tests in `apps/api` and `packages/shared`
- [x] Configure Playwright for `apps/web` E2E tests
- [x] Add a pre-commit git hook (via `husky` + `lint-staged`) running lint + format on staged files
- [x] Establish base folder structure inside `apps/api` (`/routes`, `/agents`, `/services`, `/db`, `/middleware`)
- [x] Establish base folder structure inside `apps/web` (`/app` routes matching `PRD.md` Section 7's information architecture)
- [x] Build the application shell: `apps/web` root layout, bottom tab navigation component, theme tokens matching `PRD.md` Section 6's color system
- [x] Provision a Supabase project (dev) and connect `apps/api` to it via the service-role key
- [x] Write the initial Supabase migration creating the `identity` and `comparison` schemas (empty, tables added in Phase 2)
- [x] Wire Supabase Auth into `apps/web` (phone OTP sign-in) and `apps/api` (JWT validation middleware)

## Phase 2 — Core Product Loop

### Task 1 — Merchant identity registration (backend)

- [ ] Create `identity.merchant_identity` and `public.merchant` migrations per `ARCHITECTURE.md` Section 5
  - [ ] Add RLS policies restricting `identity.merchant_identity` to owning merchant + service role
  - [ ] Add unique constraint on `gst_udyam_number`
- [ ] Implement `POST /api/v1/merchants/register/identity` (mocked GST/Udyam+OTP path and mocked penny-drop path, per `PRD.md` Feature: Merchant Registration)
  - [ ] `zod` request schema in `packages/shared`
  - [ ] Duplicate-GST conflict handling (409 + dispute-channel pointer)

**Depends on:** Phase 1 complete.

**Done when:**

- Both identity paths create a `merchant_identity` row with the correct `identity_tier`.
- A duplicate GST number returns `409 CONFLICT`.
- Unit tests cover both success paths and the duplicate case.

### Task 2 — Merchant identity registration (frontend)

- [ ] Build the registration wizard step 1 UI (`/register`) — path selection (GST/Udyam vs. penny-drop)
- [ ] Build the OTP-confirmation sub-step UI (mocked OTP entry)
- [ ] Build the penny-drop sub-step UI (VPA entry + mocked confirmation)
- [ ] Wire both to the Task 1 API with loading/error/success states per `PRD.md` Section 6

**Depends on:** Task 1.

**Done when:**

- A user can complete either identity path end-to-end in the UI and land on step 2.
- Loading, error (duplicate GST), and success states are all visibly distinct and match the UX-states spec.

### Task 3 — Reference capture & location binding (backend)

- [ ] Create `comparison.merchant_credential`, `comparison.registered_qr`, `comparison.reference_embedding` migrations (enable `pgvector`)
- [ ] Implement transient photo upload endpoint (`POST /api/v1/merchants/register/reference`) using Supabase Storage as a buffer
  - [ ] Extract embedding synchronously
  - [ ] Delete the uploaded photo object immediately after extraction succeeds or fails
- [ ] Implement location-binding logic: compare submitted GPS to `identity.merchant_identity.kyc_address` (geocoded), flag `location_variance` if outside the configured radius (does not block)

**Depends on:** Task 1.

**Done when:**

- A reference photo produces a stored embedding and zero persisted photo bytes (verified by inspecting the storage bucket after the call).
- A `MERCHANT_CREDENTIAL` and its first `REGISTERED_QR` row exist with `status = pending_activation`.
- An out-of-radius registration succeeds but is flagged `location_variance = true`.

### Task 4 — Reference capture & location binding (frontend)

- [ ] Build the camera capture UI (`getUserMedia`) for the reference photo step
- [ ] Request and handle geolocation permission, including the permission-denied UX state
- [ ] Wire to Task 3's endpoint

**Depends on:** Task 3, Task 2.

**Done when:**

- Permission-denied shows the dedicated explanatory screen from `PRD.md` Section 6, not a silent failure.
- A successful capture advances the wizard to the proof-of-possession step.

### Task 5 — Proof-of-possession (mocked)

- [ ] Implement `POST /api/v1/merchants/register/proof-of-possession` (mock confirmation, transitions credential `pending_activation → recently_registered`)
- [ ] Build the corresponding UI step with a clearly-labeled "simulated for demo" note in a dev/admin-only debug panel (not shown to end users in the actual flow copy)

**Depends on:** Task 3.

**Done when:**

- Credential status transitions correctly.
- The mock is isolated behind a single clearly-named service function so swapping in a real payment integration later touches one file.

### Task 6 — Blockchain credential anchoring

- [ ] Set up a testnet wallet (Polygon Amoy) and fund it via faucet (documented in a `docs/blockchain-setup.md`, not committed secrets)
- [ ] Implement the anchor service using `ethers.js`: compute credential hash, submit a plain transaction with the hash in `data`
- [ ] Create `comparison.blockchain_anchor` migration
- [ ] Implement the async retry queue (exponential backoff, 5 attempts) per `ARCHITECTURE.md` Section 3
- [ ] Trigger anchoring on credential activation and on any material credential update (new QR added, location changed)
- [ ] Surface the block-explorer link in the credential dashboard UI and on `GET /api/v1/verify/:credentialId`

**Depends on:** Task 5.

**Done when:**

- A newly activated credential has a `confirmed` `blockchain_anchor` row within a reasonable retry window on the chosen testnet.
- The explorer link resolves and the on-chain data matches a locally recomputed hash.
- A simulated testnet failure (wrong RPC URL) is retried and eventually marked `failed` without crashing the request that triggered it.

### Task 7 — QR Decode Agent + payload lookup

- [ ] Implement client-side QR decoding (`jsQR` + `BarcodeDetector` fallback) in the scan UI component (shared between self-audit and `/check`)
- [ ] Implement the payload-hash lookup service (`registered_qr` table, with the in-memory cache from `ARCHITECTURE.md` Section 3)

**Depends on:** Task 3.

**Done when:**

- Scanning a known QR resolves to its `credential_id` in under 50ms (cache hit) or a single indexed query (cache miss).
- Scanning an unrecognized payload returns a clean "no match" result the orchestrator can act on.

### Task 8 — Identity, Vision, Context, Attestation Agents

- [ ] Write the Identity Agent prompt + Gemini call wrapper (structured JSON output)
- [ ] Write the Vision Agent: extract a live embedding from the audit photo, cosine-compare to the stored reference embedding, return a soft similarity score (never a standalone red flag)
- [ ] Write the Context Agent prompt/logic: compare live GPS to `registered_qr.bound_lat/lng/radius`
- [ ] Write the Attestation Agent: compute `attestation_diversity_score` from `attestation_signal` rows for the credential
- [ ] Implement the AI data-boundary guard (`ARCHITECTURE.md` Section 8 table) as a shared utility that strips identity-schema fields before any Gemini call is constructed

**Depends on:** Task 7.

**Done when:**

- Each agent is independently unit-testable with mocked Gemini responses.
- The data-boundary guard has a test proving a GST number or bank VPA can never appear in an outgoing Gemini request payload.

### Task 9 — Misbinding Agent + Trust Agent + verdict assembly

- [ ] Implement the Misbinding Agent: given the four upstream agent outputs, determine internal consistency (e.g., right QR, wrong place)
- [ ] Implement the Trust Agent: combine all signals into one of `VERIFIED / RECENTLY_REGISTERED / WARNING` plus a `verdict_reason` code (`UNKNOWN_QR`, `LOCATION_MISMATCH`, `MISBINDING`, `OK`)
- [ ] Implement the trust-ramp scoring formula from `ARCHITECTURE.md` Section 4 exactly as specified (including the single-WARNING-overrides-everything rule)
- [ ] Implement the degraded-mode fallback logic from `ARCHITECTURE.md` Section 10
- [ ] Create the `comparison.audit_run` migration and persist every run (including `agent_outputs` JSON and `degraded_check` flag)

**Depends on:** Task 8.

**Done when:**

- A genuine-sticker scan against a fresh demo credential returns 🟡 with `verdict_reason = OK`.
- A swapped-QR scan returns 🔴 with `verdict_reason = UNKNOWN_QR` or `MISBINDING` as appropriate.
- A relocated-genuine-QR scan returns 🔴 with `verdict_reason = LOCATION_MISMATCH`.
- Simulating an Identity or Context agent failure returns `service_unavailable`, never a guessed verdict.
- Simulating a Vision or Attestation agent failure returns a verdict with `degraded_check = true` using the remaining agents.

### Task 10 — Self-audit flow (frontend)

- [ ] Build the self-audit scan screen (`/audit/run`), reusing the Task 7 scan component
- [ ] Build the loading state with per-agent status labels per `PRD.md` Section 6
- [ ] Build the verdict result screen (full-screen takeover, colored band, icon, reason text)
- [ ] Build `/audit/history` with pagination

**Depends on:** Task 9.

**Done when:**

- All three verdict outcomes render with visually and textually distinct states.
- History list paginates correctly against `GET /api/v1/audit/history`.

### Task 11 — Customer `/check` flow

- [ ] Implement `POST /api/v1/check` (no auth required, reuses the Task 9 verdict engine)
- [ ] Build the `/check` frontend screen (no login gate)
- [ ] Handle the "QR not registered with QRaksha at all" case as a distinct 🟡 message (not a red flag) per `PRD.md`

**Depends on:** Task 9.

**Done when:**

- A logged-out user can complete a full check-and-see-verdict cycle.
- An unregistered QR shows the correct non-alarming 🟡 messaging.

### Task 12 — Multi-QR support

- [ ] Implement `POST /api/v1/credentials/:id/qrs` (add a QR to an existing credential, inherits the abbreviated ramp per `ARCHITECTURE.md` Section 4)
- [ ] Build the `/credential/qrs` management UI (list + add new QR flow reusing the capture component from Task 4)

**Depends on:** Task 9.

**Done when:**

- A second QR added to a 🟢 credential starts with the documented abbreviated `clean_audit_count`.
- The self-audit scan screen lets the merchant pick among multiple QRs (or auto-resolves via payload match).

## Phase 3 — Secondary Features

- [ ] Dispute filing endpoint (`POST /api/v1/disputes`) and UI (`/credential/dispute/new`), including the immediate auto-downgrade-to-WARNING side effect
- [ ] Admin disputes queue (`GET /api/v1/admin/disputes`, `/admin/disputes` UI)
- [ ] Admin dispute resolution (`PATCH /api/v1/admin/disputes/:id`) requiring a non-null `resolution_reason`
- [ ] Admin credential registry search/filter (`GET /api/v1/admin/credentials`, `/admin/registry` UI)
- [ ] Public credential verification page (`GET /api/v1/verify/:credentialId`, `/verify/:credentialId` UI) with explorer link
- [ ] Merchant settings screen (`/settings`): profile info, log out
- [ ] Demo registry seeding endpoint and script (`POST /api/v1/admin/registry/seed`), 5–10 fictional merchants per `PRD.md`

## Phase 4 — Security & Reliability

- [ ] Write and run RLS policy tests confirming a merchant cannot read another merchant's `identity.merchant_identity` or `comparison.merchant_credential` rows
- [ ] Write and run an authorization test confirming a non-admin JWT is rejected on every `/admin/*` route
- [ ] Add and test rate limiting on `/api/v1/audit/run`, `/api/v1/check`, `/api/v1/disputes`, and OTP endpoints per `ARCHITECTURE.md` Section 6/8
- [ ] Add security headers (CSP, `X-Content-Type-Options`, `Referrer-Policy`) to `apps/web`
- [ ] Run `npm audit` and resolve/document any high/critical findings
- [ ] Confirm no secret values exist in git history (`git log -p` scan) before first public push
- [ ] Add structured logging with correlation IDs across `apps/api`, confirm no PII appears in logs (manual review of a sample of `audit_run` and error logs)
- [ ] Document a manual backup/export procedure for the Supabase project (MVP does not need automated backups beyond Supabase's own defaults, but the procedure must exist and be written down)

## Phase 5 — Testing

- [ ] Unit tests: each of the five agents (mocked Gemini responses covering pass/fail/timeout)
- [ ] Unit tests: trust-ramp scoring formula (boundary values around every threshold in `ARCHITECTURE.md` Section 4)
- [ ] Integration/API tests: full registration flow, full self-audit flow, full dispute flow (Supertest against a test Supabase project)
- [ ] Component tests: verdict result card in all three tiers, all UX states (loading/empty/error/disabled/permission-denied/offline) from `PRD.md` Section 6
- [ ] E2E tests (Playwright): the two flagship demo scenarios — QR replacement detected, QR relocation detected — run against the seeded demo registry
- [ ] Edge case tests: duplicate GST registration, out-of-radius registration warning, degraded-mode verdict, unknown-QR check
- [ ] Accessibility audit pass (automated via `axe-core` in Playwright + one manual screen-reader pass) against the acceptance criteria in `PRD.md` Section 6

## Phase 6 — Polish

- [ ] Responsive pass across the mobile/tablet/desktop breakpoints defined in `PRD.md` Section 6
- [ ] Confirm every feature's loading/empty/success/error/disabled/permission-denied/offline states are implemented, not just the happy path
- [ ] Add the verdict-reveal animation with `prefers-reduced-motion` handling
- [ ] Accessibility fixes from the Phase 5 audit
- [ ] Performance pass against the targets in `ARCHITECTURE.md` Section 11 (measure, don't guess)
- [ ] Basic SEO/meta tags on the public landing (`/`) and `/verify/:credentialId` pages only (the rest of the app is behind auth or camera-first, where SEO doesn't apply)
- [ ] Final UX copy review for plain language (target: understandable by Persona 1/2 from `PRD.md`, low technical sophistication)

## Phase 7 — Production Readiness

- [ ] Stand up the staging environment per `ARCHITECTURE.md` Section 13
- [ ] Run the full migration set against staging and verify RLS policies hold
- [ ] Wire Sentry into both apps for staging and production
- [ ] Configure the health-check endpoint and connect it to the hosting platform's uptime monitor
- [ ] Fund and verify the production/demo testnet wallet balance is sufficient for the expected number of demo anchoring transactions
- [ ] Run the security review checklist (Phase 4 items) once more against the staging deployment
- [ ] Run a full performance review against staging using realistic demo-registry data volume
- [ ] Deploy to production (pilot) environment
- [ ] Document and rehearse the rollback procedure from `ARCHITECTURE.md` Section 13
- [ ] Final acceptance test: walk through every criterion in `PRD.md` Section 8 against the production deployment

## Phase 8 — Future Roadmap (explicitly out of MVP scope)

- [ ] Real GST/Udyam government API + OTP integration (replaces the Task 1 mock)
- [ ] Real bank penny-drop API integration (replaces the Task 1 mock)
- [ ] Real proof-of-possession micro-transaction via a live payment integration (replaces the Task 5 mock)
- [ ] Android default-QR-handler registration
- [ ] Notification-listener post-payment alert
- [ ] Paid "Verified" trust badge purchase flow
- [ ] Market-association/campus batch-onboarding admin tooling (Stage 2 cohort expansion)
- [ ] Per-verification licensing API for a market association or PSP
- [ ] Licensable verification SDK for direct PSP (GPay/PhonePe) embedding
- [ ] Optional minimal smart contract replacing the plain-transaction blockchain anchor
- [ ] RBI/NPCI sandbox engagement and full DPDP-compliant consent framework
- [ ] Full third-party security audit before handling real merchant data at scale
