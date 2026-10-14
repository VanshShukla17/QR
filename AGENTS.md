# AGENTS.md — QRaksha

## 1. Mission

QRaksha is a merchant self-audit tool that detects when a physical UPI QR sticker has been swapped, cloned, or relocated, using a five-agent AI verification pipeline and a public blockchain anchor for tamper-evident record-keeping. As an AI coding agent on this repository, your responsibility is to implement exactly the current task from `TASKS.md`, in a way that matches `PRD.md`'s product requirements and `ARCHITECTURE.md`'s technical decisions, without expanding scope or re-deciding settled architecture on your own.

## 2. Mandatory Context Loading

Before changing anything, read, in order:

```text
AGENTS.md
PRD.md
ARCHITECTURE.md
TASKS.md
```

Then identify the current task: the first task in `TASKS.md` with an unchecked box, read top to bottom. Work on that task and nothing else in this session unless the user explicitly directs otherwise.

## 3. One-Task-at-a-Time Rule

The agent must:

- Never skip ahead to a later task, even if it looks easy or related.
- Never implement multiple unrelated tasks in one session.
- Never silently expand a task's scope beyond its stated subtasks and "Done when" criteria.
- Never rewrite working code unless the current task requires it.
- Never change a decision recorded in `ARCHITECTURE.md` without first documenting the change there (see Section 12) and flagging it to the user.
- Never mark a task's checkbox complete unless every subtask and every "Done when" criterion is actually satisfied.

## 4. Project Commands

```bash
# from repo root (npm workspaces)
npm install                          # install
npm run dev --workspace=apps/web     # development (frontend)
npm run dev --workspace=apps/api     # development (backend)
npm run build --workspaces           # build
npm run lint --workspaces            # lint
npm run format                       # format (Prettier, repo root)
npm run typecheck --workspaces       # typecheck
npm run test --workspaces            # test (Vitest)
npm run test:e2e --workspace=apps/web # test:e2e (Playwright)
```

If a workspace's `package.json` doesn't yet define one of these scripts, add it as part of the Phase 1 setup task rather than working around its absence.

## 5. Code Style

- **TypeScript:** `strict: true` in every workspace's `tsconfig.json`; no `any` without an inline comment explaining why it's unavoidable.
- **Naming:** `camelCase` for variables/functions, `PascalCase` for React components and TypeScript types/interfaces, `SCREAMING_SNAKE_CASE` for true constants, `snake_case` for database columns (matches `ARCHITECTURE.md` Section 5).
- **Components:** One component per file; colocate a component's own styles/tests next to it.
- **File naming:** `kebab-case.ts(x)` for files, matching the exported symbol's purpose (e.g., `verdict-card.tsx` exports `VerdictCard`).
- **Folder organization:** Mirrors `ARCHITECTURE.md`'s system architecture — `apps/api/routes`, `/agents`, `/services`, `/db`, `/middleware`; `apps/web/app/<route>` per `PRD.md` Section 7's information architecture.
- **Import ordering:** Node builtins → external packages → `packages/shared` → relative imports, each group blank-line separated (enforced by ESLint import-order rule).
- **Function size:** Prefer functions under ~40 lines; a longer function is a signal to extract a named helper, especially inside the agent orchestrator.
- **Comments:** Explain _why_, not _what_; every non-obvious architectural tradeoff already documented in `ARCHITECTURE.md` doesn't need re-explaining in code comments — link to the section instead.
- **Abstraction rules:** No abstraction without at least two current call sites needing it. Do not build a generic "agent framework" — five concrete agent modules calling one shared Gemini-client wrapper is sufficient (per `ARCHITECTURE.md` Section 2).
- **Dependency rules:** See Section 13.

## 6. Architecture Rules

The agent must:

- Follow `ARCHITECTURE.md` as the source of truth for stack, data model, and API shape.
- Avoid unnecessary dependencies (Section 13).
- Avoid premature abstraction and premature optimization (see `ARCHITECTURE.md` Section 11, "what NOT to optimize prematurely").
- Keep the frontend/backend/data boundary intact: `apps/web` never calls Gemini or the blockchain directly, and never receives the Supabase service-role key or the chain signing key.
- Keep business logic (agent orchestration, trust-ramp scoring, verdict assembly) in `apps/api/services`, unit-testable independent of the Express route layer.
- Keep secrets out of source code — see `.env.example` files created in Phase 1; never hardcode a key, even "temporarily for testing."
- Never hardcode production credentials, including the demo/production testnet wallet's private key.

## 7. Error Handling

- **Expected errors:** validation failures, duplicate registrations, rate limits, unregistered QR checks — handled explicitly per the error-category table in `ARCHITECTURE.md` Section 10, always returning the documented error-code shape.
- **Unexpected errors:** caught at the Express error-handling middleware layer, logged with a correlation ID, returned to the client as a generic `500 INTERNAL_ERROR` — never leak stack traces or internal messages.
- **Logging requirements:** every error log includes a correlation ID; agent-pipeline errors additionally log which specific agent failed and whether the pipeline fell back to degraded mode.
- **User-facing messages:** plain language, no internal codes or jargon, matching `PRD.md` Section 6's error-state guidance.
- **API error conventions:** exactly as specified in `ARCHITECTURE.md` Section 6.
- **Retry behavior:** as specified in `ARCHITECTURE.md` Section 10 — one immediate retry for transient agent-call failures, exponential backoff (5 attempts) for blockchain anchoring.
- Never hide errors with empty `catch` blocks. A caught error is always either logged, rethrown, or explicitly and visibly handled with a comment explaining why swallowing it is correct in that specific case.

## 8. Security Rules

The agent must:

- Validate all external input via the shared `zod` schemas in `packages/shared` before it reaches business logic.
- Sanitize/validate uploaded file types and sizes per `ARCHITECTURE.md` Section 8 before processing.
- Never trust client-supplied authorization claims — always re-derive the caller's identity/role from the validated JWT, never from a request body field.
- Protect every merchant- and admin-scoped endpoint with both the Express auth middleware and the corresponding Postgres RLS policy (defense in depth, per `ARCHITECTURE.md` Section 7).
- Never expose secrets in logs, error messages, client bundles, or committed files.
- Never log GST/Udyam numbers, bank VPAs, or raw photo bytes, per the PII rules in `ARCHITECTURE.md` Section 8.
- Follow least privilege: admin routes never grant access to `identity.merchant_identity` rows in the current MVP scope.
- Avoid insecure defaults: no wildcard CORS, no disabled TLS verification, no permissive RLS policies "to make testing easier" left in place past a local-dev branch.
- Review the security implications of any new dependency before adding it (Section 13) — this specifically includes checking whether it would touch the identity/comparison data boundary.
- Enforce the AI data-boundary table in `ARCHITECTURE.md` Section 8 in code, not just in documentation — the shared guard utility from `TASKS.md` Task 8 must be used by every agent call site, with no exceptions.

## 9. Database Rules

- Every schema change ships as a versioned Supabase migration file, reviewed in the same PR as the code that depends on it — never a manual dashboard edit.
- Table names: `snake_case`, singular (`merchant`, not `merchants`) to match the entities named in `ARCHITECTURE.md` Section 4.
- Foreign keys: always `ON DELETE RESTRICT` unless a specific cascade behavior is documented in the migration's own comment (this system's audit/compliance nature means silent cascading deletes are almost always wrong).
- Indexing: every foreign key and every column named in `ARCHITECTURE.md` Section 5's "Indexes" notes must have a matching index in the migration that creates the table.
- Transactions: any operation that writes to more than one table atomically (e.g., credential activation + blockchain-anchor-queue insert) must be wrapped in a database transaction.
- Data validation: enforce `CHECK` constraints for enum-like columns (`status`, `trust_tier`, `verdict`) at the database level, not only in application code.
- Seed data: only the demo-registry seed script (Task in Phase 3) may insert fictional merchant data, and only in non-production environments unless explicitly running the pilot's own demo cohort seed.

## 10. API Rules

- Versioning: all routes under `/api/v1`; a breaking change gets a new version prefix, not a silent change to `v1`.
- Naming: resource-based, plural nouns for collections (`/credentials`), matching `ARCHITECTURE.md` Section 6.
- HTTP semantics: `GET` never mutates state; `POST` creates; `PATCH` partially updates; `DELETE` is not currently used anywhere in the MVP API surface (disputes/suspensions are state transitions, not deletions).
- Validation: every route validates its input with a shared `zod` schema before executing any business logic.
- Error responses: exactly the shape defined in `ARCHITECTURE.md` Section 6.
- Pagination: cursor- or offset-based (implementer's choice, but consistent across `audit/history` and `admin/credentials`), documented in the route's own code comment once chosen.
- Authentication/authorization: every route explicitly states its auth requirement in its route-definition file (public / merchant / admin) — no route should be ambiguous about who can call it.

## 11. Testing Rules

- **Unit tests** are required for: every agent module, the trust-ramp scoring function, the AI data-boundary guard, and any pure business-logic function in `apps/api/services`.
- **Integration/API tests** are required for every route listed in `ARCHITECTURE.md` Section 6, covering at minimum its documented success case and its most likely error case.
- **Component tests** are required for the verdict-result card (all three tiers) and for every UX state enumerated in `PRD.md` Section 6.
- **E2E tests** are required for the two flagship demo scenarios (QR replacement, QR relocation) before Phase 7 (Production Readiness) begins.
- No task in `TASKS.md` may be marked complete while its required tests are failing, skipped, or commented out.

## 12. Documentation Rules

Whenever an implementation detail forces a change to a decision recorded in `PRD.md` or `ARCHITECTURE.md` (e.g., a different trust-ramp constant turns out to be necessary, or a route's request shape changes), update that document in the same PR as the code change — update only the section that actually changed, and note the change in the PR description. Do not let documentation and implementation drift apart. `TASKS.md` checkboxes are updated as part of completing each task, not batched at the end of a session.

## 13. Dependency Rules

Before adding any dependency:

1. Confirm the functionality can't reasonably be built with what's already in the stack (`ARCHITECTURE.md` Section 2).
2. Confirm the package is actively maintained (recent releases, no long-abandoned status).
3. Check its bundle-size/runtime impact, especially for anything added to `apps/web`.
4. Check for known security advisories (`npm audit` before merging).
5. Write one sentence in the PR description documenting why the dependency is necessary.

Avoid dependency sprawl — this project's stack is deliberately narrow (Next.js, Express, Supabase client, `zod`, `ethers.js`, Gemini SDK/fetch, Tailwind, Vitest, Playwright, Sentry SDKs). A proposed addition outside that list should be a deliberate, documented decision, not a default.

## 14. Git Rules

- Commit messages: `type(scope): summary` (e.g., `feat(api): add proof-of-possession endpoint`), types limited to `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.
- Keep commits small and logically scoped to one `TASKS.md` subtask or a coherent group of them.
- Never commit secrets, `.env` files, or anything matching the `.gitignore` patterns set up in Phase 1.
- Never commit generated/build output (`.next/`, `dist/`, `node_modules/`).
- No unrelated changes in a single commit — a task's implementation PR should not also reformat unrelated files.

## 15. AI Coding Behavior

The AI agent must:

- Inspect existing code in the relevant workspace before editing, rather than assuming a pattern that hasn't actually been established yet.
- Reuse existing patterns (the shared Gemini-client wrapper, the shared `zod` schemas, the existing scan-capture component) rather than re-implementing something similar from scratch.
- Prefer small, reviewable changes scoped to the current task over large multi-file rewrites.
- Explain any risky architectural change in the PR description before making it, and prefer flagging it to the user over deciding unilaterally when `ARCHITECTURE.md` doesn't already cover the situation.
- Never fabricate an API — if `ARCHITECTURE.md` or a task doesn't specify a detail (e.g., an exact Gemini model string, since these change over time), state the assumption explicitly in a code comment and in the PR description rather than guessing silently.
- Never assume an external service (Gemini, the testnet RPC, Supabase) works without verifying it in the current environment — write and run the relevant health-check or integration test rather than assuming.
- Never silently change a product requirement from `PRD.md` (e.g., quietly relaxing the "no credential reaches 🟢 on day one" rule) — if a requirement seems wrong or impractical, flag it to the user rather than working around it silently.
- Ask for clarification when a decision would materially change product behavior and isn't already resolved by `PRD.md` or `ARCHITECTURE.md`.
- Preserve working functionality — a task's implementation should not regress a previously completed task's "Done when" criteria.
- Avoid destructive commands (`DROP TABLE`, force-pushes, bulk deletes) unless the user has explicitly authorized that specific action in that specific session.

## 16. Definition of Done

A task in `TASKS.md` is complete only when:

- The implementation satisfies every subtask and every "Done when" criterion listed for it.
- Relevant tests (Section 11) pass.
- `npm run typecheck --workspaces` passes.
- `npm run lint --workspaces` passes.
- `npm run format` has been applied (no formatting diffs remain).
- No known regression exists against any previously completed task.
- `PRD.md`/`ARCHITECTURE.md` are updated if the implementation changed a documented decision (Section 12).
- The task's checkbox(es) in `TASKS.md` are checked.
- The implementation matches `PRD.md`'s functional requirements and `ARCHITECTURE.md`'s technical decisions for that feature.
