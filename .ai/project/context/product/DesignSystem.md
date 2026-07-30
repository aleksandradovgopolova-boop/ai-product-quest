---
stability: evolving
reviewed_at: 2026-07-29
expires_after_days: 90
owner: project-team
sources:
  - DESIGN.md
  - docs/ui_bible.md
  - app/styles/tokens.css
  - app/styles/game.css
---

# Design System

## Design Principles

- One viewport, one thought or one action.
- The interface is a system conversation, not a website.
- Empty space, pauses, typography, and system reaction carry the atmosphere.
- Decorative effects are allowed only when they communicate system state.
- If a new element can be removed without reducing understanding, remove it.

## Design Tokens

### Color

| Role | Value | Source |
|---|---|---|
| background | `#090909` | `--background` |
| foreground | `#eaeaea` | `--foreground` |
| muted | `#8a8a8a` | `--muted` |
| accent | `#7fffd4` | `--accent` |

### Typography

Primary UI font: IBM Plex Mono / JetBrains Mono / Space Mono fallback stack from `--system-mono`.

### Motion

Motion uses `motion/react`. It must respect `prefers-reduced-motion` and control reading rhythm rather than decorate the interface.

### Breakpoints

Implemented in CSS through responsive constraints and media queries in `app/styles/game.css` and `app/styles/shell.css`.

## Device Matrix

| Class | Min viewport | Input | Required |
|---|---:|---|---|
| mobile | 390px | touch + keyboard-compatible controls | yes |
| desktop | 1280px | cursor + keyboard | yes |
| wide | 1680px | cursor + keyboard | should not break |

## Components

- `SystemTopbar`: case identity and active case summary.
- `SystemStatus`: system state projection.
- `ChoiceList`: command-like decision input with keyboard support.
- `CaseProgress`: narrative case progress.
- `CodexOverlay`: in-system memory layer.
- Platform views: AppShell projections for journey, Codex, artifacts, and profile.

## Patterns

- Gameplay avoids cards, hero sections, sidebars, SaaS panels, bento grids, decorative images, and typical LMS structure.
- Final screens should hand off to generated consequences such as artifacts or Codex, not dead-end into generic navigation.
- Visual QA screenshots must be reviewed after gameplay UI polish.

## Accessibility Baseline

- Keyboard: Up/Down, Enter/Space, Esc, Tab/C for Codex when available.
- Focus and active choice must be visually obvious.
- Mobile must avoid horizontal scroll and critical overlap.

## Tooling

- `npm run test:e2e` verifies browser playthrough and mobile viewport integrity.
- `npm run qa:chapter01:screens` captures visual QA screenshots.
