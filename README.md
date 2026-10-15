# QRaksha

Visual decisions live in DESIGN.md. Do not override them here.

> Merchant self-audit tool that detects when a physical UPI QR sticker has been swapped, cloned, or relocated — backed by a five-agent AI verification pipeline and a public blockchain anchor for tamper-evident record-keeping.

## Documentation

- [AGENTS.md](AGENTS.md) — Coding rules, workflow constraints, and definition of done
- [PRD.md](PRD.md) — Product requirements document, user personas, UX states, and acceptance criteria
- [ARCHITECTURE.md](ARCHITECTURE.md) — Technical stack, data model, API design, security, and infrastructure
- [DESIGN.md](DESIGN.md) — Visual design system, color tokens, typography, layout rhythm, and component specifications
- [TASKS.md](TASKS.md) — Phased task breakdown and completion tracking

## Workspaces

- `apps/web` — Next.js PWA for merchants, customer checks, and admin console
- `apps/api` — Express.js REST API, agent orchestrator, and blockchain service
- `packages/shared` — Shared Zod schemas and TypeScript types

## Quick Start

```bash
# Install dependencies
npm install

# Run typecheck across all workspaces
npm run typecheck

# Run linter
npm run lint

# Run unit tests
npm run test

# Run frontend development server
npm run dev:web

# Run backend API development server
npm run dev:api
```
