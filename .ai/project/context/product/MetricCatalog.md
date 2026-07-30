---
stability: evolving
reviewed_at: 2026-07-29
expires_after_days: 90
owner: project-team
sources:
  - src/domain/campaign/types.ts
  - src/engines/projection/projectCampaign.ts
  - tests/golden-playthrough.test.mts
---

# Metric Catalog

No production analytics are instrumented in the MVP. The metrics below are canonical product-quality proxies derived from the Event Log and tests.

## Metrics

| Name | Definition | Source | Good Direction |
|---|---|---|---|
| chapter_completion | Event Log reaches final scene for Chapter 01 | `scene.entered` → `final` | up |
| correct_decision_submitted | `decision.submitted` with `decisionId=quarantine-report` | Event Log | up |
| codex_unlock_count | Count of `codex.entry_unlocked` events projected into `unlockedCodexEntryIds` | Projection Engine | up |
| artifact_count | Count of generated artifacts projected from `artifact.generated` | Projection Engine | up |
| e2e_playthrough_green | `npm run test:e2e` passes | Playwright | pass |
| foundation_green | `npm run test:foundation` passes | npm scripts | pass |

## Deprecated Metrics

None yet.
