---
stability: evolving
reviewed_at: 2026-07-29
expires_after_days: 90
owner: project-team
sources:
  - docs/technical_architecture.md
  - docs/architecture-review.md
  - src/domain/campaign/types.ts
---

# System Overview

## Boundaries

AI Product Quest is currently a local-first Next.js/Vinext web app. Runtime game state is browser-local and content is loaded from repository YAML.

## Components

- `app/`: route contract and CSS zones.
- `src/platform/`: AppShell and platform projection views.
- `src/features/chapter-01/`: temporary Chapter 01 vertical adapter, view, keyboard, and sound adapters.
- `src/application/`: chapter runner and persistence/content facades.
- `src/domain/campaign/`: canonical campaign, scene, event, evidence, hypothesis, and projection types.
- `src/engines/`: projection, simulation, Codex, and artifact engines.
- `src/infrastructure/`: YAML content loader and localStorage save adapter.

## Critical Flows

1. YAML content is validated and normalized by the content loader.
2. New campaigns enter Chapter 01 at `zero-boot`, the First Contact with Zero prologue.
3. `advanceMode: any-input` scenes move forward on keyboard or tap without showing action buttons.
4. Player choices append Event Log records.
5. Projection Engine rebuilds CampaignState from Event Log.
6. Codex, profile, dashboard, and artifacts are derived projections.
7. Browser E2E validates the Zero prologue, Chapter 01 happy path, keyboard flow, replay, Codex, artifacts, and mobile layout.

## Dependencies

- Next.js, React, TypeScript, Tailwind CSS, Motion.
- YAML and AJV for content validation.
- Playwright for browser E2E and QA screenshots.
- AI Ops Kit child layer for workflow/gate governance.

## Constraints

- No content in TypeScript arrays.
- No UI imports from `src/infrastructure`.
- No Chapter 02-06 implementation before Chapter 01 Polish acceptance.
- No production backend in MVP.
