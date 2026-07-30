# ADR-0007: Developer Experience Guardrails

- Status: accepted
- Date: 2026-07-29
- Owners: project team

## Context

Sprint 0 established the platform architecture, but future work can still erode boundaries through small imports, duplicated content, or untested chapter additions.

## Decision

Add architecture boundary tests, a dependency graph, Definition of Done, repository rules, and a browser playthrough layer before starting Chapter 02.

## Alternatives

- Rely on code review alone.
- Add conventions only after the second chapter exists.

## Consequences

The repository now fails fast when UI imports infrastructure, domain code learns about browser/runtime APIs, engines import UI, content leaves YAML, local source imports become cyclic, or Chapter 01 loses its browser-level happy path.

## Revisit Conditions

Revisit when the generic chapter runner replaces the Chapter 01 adapter or when server-side persistence changes the application/infrastructure boundary.
