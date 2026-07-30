---
stability: evolving
reviewed_at: 2026-07-29
expires_after_days: 90
owner: project-team
sources:
  - README.md
  - docs/architecture/dependency-graph.md
  - REPOSITORY_RULES.md
---

# Repository Map

## Directories

| Path | Purpose |
|---|---|
| `app/` | App routes and CSS zones |
| `content/` | YAML content source of truth |
| `schemas/` | JSON Schema contracts |
| `src/domain/` | Browser-agnostic domain model |
| `src/application/` | Use-case orchestration |
| `src/engines/` | Deterministic rules and projections |
| `src/infrastructure/` | Content and save adapters |
| `src/platform/` | AppShell and platform views |
| `src/features/chapter-01/` | Chapter 01 vertical slice adapter |
| `tests/` | Contract, architecture, migration, simulation, golden, and E2E tests |
| `docs/` | Product and architecture source of truth |
| `.ai/managed/` | AI Ops Kit managed layer; do not edit manually |
| `.ai/project/` | AI Ops local project context and contracts |
| `.ai/custom/` | Local custom AI Ops extensions |

## Entry Points

- `npm run dev`
- `npm run test:foundation`
- `npm run test:e2e`
- `npm run qa:chapter01:screens`
- `npm run ai:validate`

## Protected Paths

- `.ai/managed/**` is managed by AI Ops Kit updates.
- `.github/workflows/**` is protected by AI Ops approval policy.
- `content/**`, `schemas/**`, `src/domain/**`, and `src/engines/**` require contract-aware changes.
