# ADR-0003: YAML Content Source

- Status: accepted
- Date: 2026-07-29
- Owners: project team

## Context

Content existed in TypeScript arrays while the target architecture called for a single content source that non-engineering agents can read and edit.

## Decision

Use YAML files in the root `content/` directory as the content source of truth. The loader validates YAML against JSON Schemas and transforms it into runtime objects.

## Alternatives

- JSON content files.
- TypeScript content modules.
- Duplicating YAML and TypeScript arrays.

## Consequences

Content is readable and independent from runtime code. The loader becomes the only place where raw content becomes executable data.

## Revisit Conditions

Revisit if localization, branching authoring tools, or a CMS requires a different source format.
