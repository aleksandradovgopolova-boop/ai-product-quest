# ADR-0004: Save Migrations

- Status: accepted
- Date: 2026-07-29
- Owners: project team

## Context

The prototype used several save keys: `ai-product-quest-flow-v1`, `ai-product-quest-mission-v2`, and `ai-product-quest-progress`.

## Decision

Use one canonical save key: `ai-product-quest-campaign-v1`. On first load, migrate known legacy keys into the Event Log, save the new format, and remove legacy keys.

## Alternatives

- Keep all old keys.
- Drop old saves without migration.

## Consequences

Persistence has one entry point and old saves are not allowed to shape future architecture.

## Revisit Conditions

Revisit when server-side account saves or export/import is added.
