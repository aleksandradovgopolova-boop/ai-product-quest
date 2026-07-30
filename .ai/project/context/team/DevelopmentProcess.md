---
stability: evolving
reviewed_at: 2026-07-29
expires_after_days: 90
owner: project-team
sources:
  - REPOSITORY_RULES.md
  - docs/architecture/definition-of-done.md
  - README.md
---

# Development Process

## Intake

- Clarify whether the task changes content, architecture, gameplay UI, persistence, or documentation.
- For feature/gameplay work, use Chapter 01 until Polish is accepted.
- Do not add Chapters 02-06 without explicit acceptance.

## Planning

- Identify affected layers: content, schema, domain, engine, application, adapter, view, tests.
- Add or update ADRs when state, routing, persistence, content format, or AI Ops governance changes.

## Implementation

- Keep content in YAML.
- Keep domain browser-agnostic.
- Keep UI away from infrastructure imports.
- Use projections rather than manually mutating dashboard, Codex, profile, or artifacts.

## Review

- Run `npm run test:foundation` for foundation, routing, content, persistence, or gameplay UI changes.
- Run `npm run qa:chapter01:screens` for visual polish.
- Run `npm run ai:validate` when AI Ops context, events, gates, or managed overlays change.

## Release

No production release flow exists yet. Local MVP review is the current delivery path.
