# Repository Rules

These rules are mandatory for Codex, Claude Code, and any agent or developer working on AI Product Quest.

1. Do not store game content in TypeScript arrays.
2. `content/` is the YAML source of truth.
3. `schemas/` validates content and state contracts.
4. UI must not import `src/infrastructure`.
5. UI must not read YAML files directly.
6. Domain code must not import React, browser APIs, infrastructure, engines, application, or UI.
7. Engines must not import UI, app routes, or infrastructure.
8. Application services coordinate domain, engines, and infrastructure.
9. Projections are derived from Event Log; do not mutate projected state manually.
10. Any meaningful `CampaignState` change needs migration review.
11. Any new chapter needs a Golden Playthrough test and a browser E2E happy path.
12. Any new engine needs deterministic tests.
13. Codex unlocks must be event-driven.
14. Artifact generation must be event-driven.
15. Legacy code must live in an explicit `legacy/` folder with a removal plan, or be deleted.
16. Gameplay UI must follow `DESIGN.md`.
17. Do not add Chapters 02-06 before Chapter 01 Polish is accepted.
18. Do not run `npm audit fix --force` as part of feature or architecture work.
19. Run `npm run test:foundation` before declaring foundation, routing, content, persistence, or gameplay UI work done.
20. Do not edit `.ai/managed/**` manually; project-specific AI Ops knowledge belongs in `.ai/project/**` or `.ai/custom/**`.
21. Any new domain event must be added to `.ai/project/contracts/events.yaml`.
22. If a rule must be broken, add or update an ADR first.
