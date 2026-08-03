---
stability: volatile
reviewed_at: 2026-07-29
expires_after_days: 14
owner: project-team
sources:
  - README.md
  - docs/architecture-review.md
  - tests/e2e/chapter-01.spec.ts
---

# Product Status

## What Is Actually Ready

| Area | Status | Evidence |
|---|---|---|
| Frontend | Ready for local MVP review | `app/`, `src/platform/`, `src/features/chapter-01/` |
| Chapter 01 | Playable vertical slice | `content/chapters/chapter-01/`, `tests/golden-playthrough.test.mts`, `tests/e2e/chapter-01.spec.ts` |
| First Contact with Zero | Implemented as the cold open of Chapter 01: Zero appears inside the incident, not before it | `content/chapters/chapter-01/scenes.yml`, `advanceMode: any-input`, `tests/e2e/chapter-01.spec.ts` |
| Content source | YAML source of truth | `content/`, `schemas/`, `src/infrastructure/content/contentLoader.ts` |
| State model | Event Log with projections | `src/domain/campaign/types.ts`, `src/engines/projection/projectCampaign.ts` |
| Persistence | Local browser storage only | `src/infrastructure/save/saveAdapter.ts` |
| Codex | Projection-based unlocks | `src/engines/codex/codexRules.ts` |
| Artifacts | Projection-generated markdown artifact | `src/engines/artifact/artifactEngine.ts`, `/artifacts` |
| AI Ops Kit | Installed child layer | `.ai-ops.yaml`, `.ai/managed/`, `.ai/project/` |
| Tests | Foundation and E2E gates exist | `npm run test:foundation`, `npm run test:e2e` |
| Deployment | Local only | `npm run dev`, `http://localhost:3000/` |

## Deferred

- Chapters 02-06.
- Server persistence/event store.
- Authentication and user accounts.
- Production analytics.
- External AI provider calls inside the game.
- OpenSpec workflow adoption for feature specs.

## Sources Of Truth

- Product/architecture docs: `docs/`.
- Visual contract: `DESIGN.md`.
- Repository rules: `REPOSITORY_RULES.md`.
- Content: `content/`.
- Schemas: `schemas/`.
- AI Ops project overlay: `.ai/project/`.
