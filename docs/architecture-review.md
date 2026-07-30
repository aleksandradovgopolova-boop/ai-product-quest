# Architecture Review — Sprint 0

## Accepted Target

AI Product Quest is a single platform with a canonical product model:

```text
Platform → Season → Chapter → Scene
```

Sprint 0 implements only `chapter-01` as a vertical slice. Chapters 02-06 stay out of the repository until the route, content, state, save, and projection contracts are accepted.

## Current Architecture

```text
app routes
  → src/platform/AppShell
  → platform views or /play/[chapterId]

/play/chapter-01
  → src/features/chapter-01/Chapter01Adapter
  → application/chapter-runner
  → engines/projection + engines/simulation + engines/codex + engines/artifact
  → domain/campaign
  → infrastructure/content + infrastructure/save
```

## Source Of Truth

- `content/` is the content source of truth.
- `docs/` is the product and architecture source of truth.
- `schemas/` is the validation source of truth.
- `src/` contains runtime code only.

Chapter content is YAML, validated with JSON Schema, then normalized by `src/infrastructure/content/contentLoader.ts`.

## State Model

History is stored as an Event Log. `CampaignState`, dashboard, profile, Codex state, and artifacts are projections of that log.

The canonical `CampaignState` includes:

- `schemaVersion`;
- `campaignId`;
- current `chapter` and `scene`;
- `eventLog`;
- `systemState`;
- `system`;
- `decisions`;
- `unlockedCodexEntryIds`;
- `artifacts`;
- `engineerProfile`;
- `dashboard`;
- scene `variables`.

## Route Contract

- `/` — main / continue campaign;
- `/journey` — season and chapter map;
- `/play/[chapterId]` — chapter runner;
- `/codex` — Codex projection;
- `/artifacts` — artifact projection;
- `/profile` — AI Product Engineer profile.

Removed from the target contract:

- `/episode`;
- `/museum`;
- `/competencies`.

## Legacy Removed

- `src/components/game/GameMission 2.tsx`;
- `src/components/game/GameMission.tsx` compatibility alias;
- `src/components/layout/AppShell.tsx` compatibility re-export;
- old `EpisodeEngine`;
- old LMS/SaaS-style views;
- old `src/content/*` TypeScript content;
- old Zustand progress store;
- old duplicated progression helpers;
- dead visual world components;
- legacy route pages outside the accepted route contract.

Legacy save formats are handled only by `src/infrastructure/save/saveAdapter.ts`.

## Remaining Risks

- Persistence is still browser `localStorage`, not a real event store.
- React component tests are still light; browser E2E now covers the First Contact with Zero prologue, Chapter 01 happy path, keyboard flow, replay, Codex, artifacts, and mobile viewport integrity.
- The architecture package is now integrated as docs/schemas, but future agents must keep docs and implementation in sync.
- `npm audit` reports existing dependency vulnerabilities; no forced upgrades were applied during Sprint 0.

## Sprint 0.5 Addendum

Sprint 0.5 adds developer-experience guardrails:

- architecture boundary tests;
- local import-cycle checks;
- dependency graph documentation;
- Definition of Done for chapters, engines, state, UI, and dependencies;
- root repository rules.
- Chapter 01 browser playthrough with Playwright, including the Zero prologue.
- reproducible Chapter 01 visual QA screenshots via `npm run qa:chapter01:screens`.

## AI Ops Addendum

AI Ops Kit is installed as a child layer. Project-specific governance lives in `.ai/project/`:

- confirmed RepositoryProfile;
- product/system/team context;
- project quality gates;
- domain event catalog.

The managed layer `.ai/managed/**` is updated from the parent kit only and must not be edited by project tasks.

These guardrails are intentionally small and strict. They do not add new gameplay content and do not start Chapters 02-06.
