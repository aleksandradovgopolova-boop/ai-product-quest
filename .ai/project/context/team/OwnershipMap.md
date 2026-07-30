---
stability: evolving
reviewed_at: 2026-07-29
expires_after_days: 90
owner: project-team
sources:
  - REPOSITORY_RULES.md
  - docs/architecture-review.md
---

# Ownership Map

## Domains

| Domain | Owner |
|---|---|
| Product vision and acceptance | Human project owner |
| Architecture and route contract | Project team |
| Content source of truth | Project team |
| Visual contract | Project team |
| AI Ops managed layer | AI Ops Kit parent repository |
| AI Ops project overlay | This repository |

## Approvers

- Human approval is required for adding new chapters, changing save schema semantics, enabling server persistence, destructive operations, protected workflow changes, or major dependency upgrades.

## Escalation

- If docs, content, schema, and implementation disagree, stop and resolve the source-of-truth conflict before continuing.
