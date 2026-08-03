# Claude Handoff

## Current State

AI Product Quest is a local-first MVP. The repository currently contains one playable vertical slice: Chapter 01.

The first playable flow is:

```text
incident-call
→ incident-brief
→ zero-online
→ start-from-* (one of four openings)
→ chapter-title
→ Chapter 01 investigation
→ belief-ask
→ belief-answer
→ codex-prompt
→ final
```

The chapter opens on the incident itself: the world, the player's role as an outside
specialist, the clock, and the failure are on screen before Zero asks anything. The two
reflective questions live inside the case — the first move as `zero-online`, the belief
question as `belief-ask`, after the player has something to answer from.

The opening is implemented in YAML, not only in docs:

- `content/chapters/chapter-01/chapter.yml`
- `content/chapters/chapter-01/scenes.yml`

`initialSceneId` is `incident-call`.

## Source Of Truth

- Product and architecture docs: `docs/`
- Visual contract: `DESIGN.md`
- Repository rules: `REPOSITORY_RULES.md`
- Game content: `content/`
- Schemas: `schemas/`
- AI Ops project context: `.ai/project/`

Do not store game content in TypeScript arrays.

Do not edit `.ai/managed/**` manually.

## Runtime Model

The game state is Event Log first. `CampaignState`, Codex, artifacts, dashboard, and engineer profile are projections.

Important runtime areas:

- `src/domain/campaign/`
- `src/application/chapter-runner/`
- `src/engines/projection/`
- `src/engines/simulation/`
- `src/engines/codex/`
- `src/engines/artifact/`
- `src/features/chapter-01/`
- `src/infrastructure/content/`
- `src/infrastructure/save/`

## Local Run

```bash
npm run dev
```

Open:

```text
http://localhost:3000/play/chapter-01
```

If the browser still shows an old scene, clear localStorage key:

```text
ai-product-quest-campaign-v1
```

or use the in-game reset action.

## Required Checks

Before declaring gameplay, content, routing, persistence, or architecture work done:

```bash
npm run test:foundation
```

For AI Ops-only context changes:

```bash
npm run ai:validate
```

For visual polish:

```bash
npm run qa:chapter01:screens
```

## Current Boundaries

- Zero's speaker label belongs to conversation only. Machine output (`zero-boot`, `case-open`) stays unlabeled.
- Prologue answers are recorded through `setVariables` and must come back in Zero's own lines. Every branch of a question needs `setVariables`, or the recap goes blank.
- Do not add Chapters 02-06 yet.
- Keep Chapter 01 as the vertical slice until product acceptance.
- Keep Zero's voice minimal and non-expository: no world lecture, no answer handed over.
- Keep gameplay UI out of landing-page, LMS, SaaS, dashboard, bento, or card-heavy patterns.
- Any new domain event must be added to `.ai/project/contracts/events.yaml`.
