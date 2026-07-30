# ADR-0002: Campaign State And Event Log

- Status: accepted
- Date: 2026-07-29
- Owners: project team

## Context

State was previously embedded in a React component and split across several storage keys. That would not scale to multiple chapters, Codex unlocks, artifacts, or deterministic playthrough tests.

## Decision

Store history as a canonical Event Log. Build `CampaignState`, system state, decisions, Codex unlocks, artifacts, dashboard, and engineer profile as projections from events.

## Alternatives

- Persist mutable view state directly.
- Keep a Zustand store as the source of truth.

## Consequences

The game can be replayed deterministically, migrated more safely, and tested with golden playthroughs. UI code no longer owns domain rules.

## Revisit Conditions

Revisit when an external event store or multiplayer/session sync is required.
