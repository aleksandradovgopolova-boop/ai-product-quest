# ADR-0005: Projection Model

- Status: accepted
- Date: 2026-07-29
- Owners: project team

## Context

Dashboard, profile, artifacts, and Codex are different views of the same player history. If each owns separate mutable state, they will drift.

## Decision

Introduce a Projection Engine. It consumes content plus the Event Log and builds all derived views, including `CampaignState`, dashboard, engineer profile, decisions, Codex unlocks, and artifacts.

## Alternatives

- Keep independent stores per view.
- Compute everything inside React components.

## Consequences

Derived views become deterministic and testable. UI components receive projections and do not contain chapter-specific branching.

## Revisit Conditions

Revisit when projections become expensive enough to require caching or server materialization.
