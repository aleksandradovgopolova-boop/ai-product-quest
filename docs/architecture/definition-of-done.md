# Definition Of Done

## New Chapter

A chapter is ready for review only when:

- YAML content exists under `content/chapters/<chapter-id>/`;
- the chapter is referenced from the active season;
- schema validation passes;
- all scene links resolve;
- Evidence and Hypothesis objects are explicit where the chapter teaches investigation;
- Golden Playthrough exists and passes;
- browser E2E happy path exists and passes;
- Codex unlock rules are tested;
- artifact generation is tested;
- deterministic simulation test covers at least one meaningful decision;
- keyboard flow works for all choices in browser;
- the chapter passes a mobile viewport integrity smoke test;
- no chapter-specific branches are added to generic UI components;
- no content is stored in TypeScript arrays;
- no UI file imports `src/infrastructure`;
- no engine imports UI;
- no local import cycles are introduced;
- ADRs are updated when state, routing, persistence, or content format changes.

## Engine Change

An engine change is ready only when:

- it has deterministic tests;
- it does not import UI or infrastructure;
- all inputs and outputs are typed through `src/domain`;
- any randomness is seeded or removed;
- projection changes are reflected in Golden Playthrough expectations.

## CampaignState Change

A `CampaignState` change is ready only when:

- `schemaVersion` impact is documented;
- save migration behavior is updated or explicitly not required;
- `schemas/campaign-state.schema.json` is updated;
- Golden Playthrough still validates Event Log, Dashboard, Codex, artifacts, and profile;
- `docs/adr` contains an accepted ADR for major state-model changes.

## UI Change

A UI change is ready only when:

- it does not add landing, SaaS, dashboard, bento, or card-gallery patterns to gameplay;
- it preserves keyboard navigation;
- it respects `prefers-reduced-motion`;
- it keeps content and domain logic outside view components;
- gameplay UI changes pass `npm run test:e2e`;
- gameplay visual polish includes `npm run qa:chapter01:screens` review while Chapter 01 remains the only playable slice;
- it passes architecture boundary tests.

## Dependency Change

A dependency change is ready only when:

- the reason is documented in the PR or task summary;
- `npm run test:foundation` passes when the change can affect runtime, UI, routing, content, or persistence;
- `npm audit` impact is reviewed;
- forced major upgrades are handled in a dedicated patch sprint.
