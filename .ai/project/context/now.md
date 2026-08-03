---
stability: volatile
reviewed_at: 2026-07-29
expires_after_days: 14
owner: project-team
sources:
  - README.md
  - docs/architecture-review.md
  - content/chapters/chapter-01/scenes.yml
---

# Current Focus

## In Focus Now

- Polish Chapter 01 as the only playable vertical slice.
- Keep the chapter opening on the incident: the situation comes before any question the player answers.
- Keep the platform architecture stable before adding Chapters 02-06.
- Treat every gameplay change as content/schema/event/projection work, not only UI work.
- Keep visual QA and browser E2E green for desktop and mobile.

## Open Decisions

- When Chapter 01 Polish is accepted, decide whether to extract a generic chapter runner before Chapter 02.
- Decide when server-side persistence becomes necessary; localStorage is still the MVP persistence layer.
- Decide whether OpenSpec should be enabled for future multi-chapter feature work.

## Risks

- Chapter-specific logic can creep back into generic UI.
- Content changes can bypass YAML schema validation if future agents edit runtime code instead.
- Visual polish can accidentally turn the game back into a website, dashboard, or LMS.
- Future agents can miss that Zero is now implemented in YAML, not only described in docs.
