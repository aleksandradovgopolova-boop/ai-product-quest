---
stability: stable
reviewed_at: 2026-07-29
owner: project-team
sources:
  - docs/glossary.md
  - content/chapters/chapter-01/chapter.yml
  - src/domain/campaign/types.ts
---

# Glossary

## Product Terms

- Platform: the whole AI Product Quest product.
- Season: a campaign container for chapters.
- Chapter: a playable case.
- Scene: one state of the conversation inside a chapter.
- Case / Дело: narrative frame for an investigation.
- Incident / Инцидент: the product problem being investigated.
- Codex: system memory of concepts unlocked through play.
- Artifact: engineering output generated from Event Log.

## Technical Terms

- Event Log: append-only history of campaign events.
- Projection: derived view built from Event Log.
- CampaignState: canonical runtime projection of the campaign.
- Evidence: explicit clue/context shown to the player.
- Hypothesis: proposed explanation or product risk.
- Vertical Slice: Chapter 01 adapter proving the target architecture before generalizing.

## Deprecated Terms

- Episode: deprecated for gameplay structure; use Chapter/Scene/Case.
- GameMission: removed legacy adapter name.
- LMS/Museum/Competencies: old route concepts outside current route contract.
