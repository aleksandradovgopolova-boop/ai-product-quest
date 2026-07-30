# ADR-0006: Chapter 01 Vertical Adapter

- Status: accepted
- Date: 2026-07-29
- Owners: project team

## Context

`GameMission.tsx` mixed content, domain state, simulation, save, keyboard, sound, and view code in one component.

## Decision

Keep Chapter 01 as a vertical adapter that wires content, save, keyboard, sound, and view components together. Engine logic lives in `src/application`, `src/engines`, `src/domain`, and `src/infrastructure`.

## Alternatives

- Rewrite all gameplay as a generic engine immediately.
- Keep the large prototype component until more chapters exist.

## Consequences

Sprint 0 creates the seams needed for later chapters without pretending the generic engine is complete.

## Revisit Conditions

Revisit before Chapter 02 starts. At that point, shared chapter runner abstractions should absorb what is still specific to the Chapter 01 adapter.
