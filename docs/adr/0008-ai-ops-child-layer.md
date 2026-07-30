# ADR-0008: AI Ops Child Layer

- Status: accepted
- Date: 2026-07-29
- Owners: project team

## Context

AI Product Quest now needs a repeatable operating model for future work: onboarding context, quality gates, event contracts, role-aware workflows, and update boundaries for AI agents.

## Decision

Install AI Ops Kit as a child layer and treat it as project governance, not gameplay runtime.

- `.ai/managed/**` is managed by the parent AI Ops Kit package and must not be edited manually.
- `.ai/project/**` stores local source-of-truth overlays: repository profile, product/system/team context, quality gates, and event catalog.
- `.ai/custom/**` is reserved for local AI Ops extensions.
- `.ai-ops.yaml` configures this project as `AI Product Quest`, Codex-first runtime, OpenAI-first provider routing, and stable parent updates through PRs.
- Domain Event Log names are cataloged in `.ai/project/contracts/events.yaml`.
- Project gates are exposed through npm scripts, including `npm run ai:validate` and `npm run test:foundation`.

## Alternatives

- Keep AI Ops Kit installed but unconfigured.
- Copy selected AI Ops documents into normal docs only.
- Build a custom process layer instead of using the managed child model.

## Consequences

Future agents can start from verified project context instead of rediscovering architecture from scratch. The managed layer can be updated from the parent kit while local project knowledge remains protected.

The extra governance files are not gameplay content. They must stay aligned with `README.md`, `DESIGN.md`, `REPOSITORY_RULES.md`, `docs/`, `content/`, and `schemas/`.

## Revisit Conditions

Revisit when Chapter 02 starts, when server-side persistence is introduced, or when OpenSpec becomes the active spec workflow.
