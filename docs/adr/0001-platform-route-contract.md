# ADR-0001: Platform Route Contract

- Status: accepted
- Date: 2026-07-29
- Owners: project team

## Context

The MVP temporarily rendered the same mission screen from every route. That made navigation misleading and hid whether the product was a platform, a game screen, or a course shell.

## Decision

Use a stable route contract:

- `/` for main / continue campaign;
- `/journey` for season and chapter map;
- `/play/[chapterId]` for chapter playthrough;
- `/codex` for Codex;
- `/artifacts` for engineering artifacts;
- `/profile` for AI Product Engineer profile.

Only `/play/chapter-01` launches the Chapter 01 vertical slice during Sprint 0.

## Alternatives

- Keep all routes rendering `GameMission`.
- Build only `/play` and postpone platform routes.

## Consequences

The product now has a real platform shell without adding Chapters 02-06. Tests can verify route identity and prevent accidental regression to a single-screen app.

## Revisit Conditions

Revisit when multi-season routing, authentication, or server persistence is introduced.
