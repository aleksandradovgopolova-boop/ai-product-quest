---
stability: evolving
reviewed_at: 2026-07-29
expires_after_days: 90
owner: project-team
sources:
  - docs/game_design_document.md
  - docs/product_requirements_document.md
  - docs/vision.md
  - README.md
---

# Product Overview

## Purpose

AI Product Quest is a minimalist educational game-platform that teaches AI Product Engineering through incident-like interactive cases.

The product should feel like a living computer system guiding the player through an investigation, not like a course website, SaaS dashboard, or landing page.

## Users

- Primary: people moving from AI Product Builder to AI Product Engineer.
- Secondary: product managers, designers, analysts, and engineers who need product-level intuition about AI systems.

## Value Proposition

The player learns by making decisions inside a system. Concepts are unlocked through evidence, consequences, Codex entries, and generated engineering artifacts.

## Capabilities

- Platform route shell: home, journey, play, Codex, artifacts, profile.
- Chapter 01 vertical slice: "Дело №01: Непроверенный отчёт".
- Cold open on the incident: the world, the player's role as an outside specialist, the clock, the failure, Zero, one investigative choice, and the chapter title. The belief question waits until the case is closed.
- YAML content loader with schema validation.
- Event Log driven campaign state.
- Projection engine for dashboard, Codex, profile, and artifacts.
- Browser E2E and visual QA for Chapter 01.

## Non-Goals

- No Chapters 02-06 until Chapter 01 Polish is accepted.
- No LMS, landing page, SaaS dashboard, bento layout, or card-heavy learning portal in gameplay.
- No backend, authentication, payments, AI chat, or external database in the MVP.

## Owners

Project team. Human product acceptance remains required before expanding the campaign.
