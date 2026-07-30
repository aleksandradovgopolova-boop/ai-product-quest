---
stability: evolving
reviewed_at: 2026-07-29
expires_after_days: 90
owner: project-team
sources:
  - src/domain/campaign/types.ts
  - content/
  - schemas/
---

# Data Map

## Entities

- Platform
- Season
- Chapter
- Scene
- Choice
- Evidence
- Hypothesis
- GameEvent
- CampaignState
- DecisionRecord
- CodexEntry
- ArtifactTemplate
- ArtifactRecord
- EngineerProfile

## Sources

- Content: `content/**/*.yml`.
- Contracts: `schemas/*.json`.
- Runtime state: Event Log stored under `ai-product-quest-campaign-v1`.

## Storage

- Browser `localStorage` only in MVP.
- Legacy save keys are migrated and removed by `src/infrastructure/save/saveAdapter.ts`.

## Sensitivity

- No secrets should be stored in content, event logs, tests, or screenshots.
- Provider keys are referenced only through environment variable names in `.ai-ops.yaml`.
