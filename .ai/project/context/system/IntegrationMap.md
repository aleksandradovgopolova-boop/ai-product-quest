---
stability: evolving
reviewed_at: 2026-07-29
expires_after_days: 90
owner: project-team
sources:
  - package.json
  - .ai-ops.yaml
  - playwright.config.ts
---

# Integration Map

## Systems

| System | Purpose | Status |
|---|---|---|
| Vinext | Local dev/build runtime | active |
| Playwright | Browser E2E and QA screenshots | active |
| AI Ops Kit | Workflow/gate governance | active |
| GitHub Actions | AI Ops validate/update/record workflows | installed |
| OpenAI provider | AI Ops provider config via `env:OPENAI_API_KEY` | configured, secret not present |
| Anthropic provider | Fallback provider via `env:ANTHROPIC_API_KEY` | configured, secret not present |
| OpenSpec | Optional AI Ops spec protocol | not adopted for game work yet |

## Environments

- Local development: `http://localhost:3000/`.
- Playwright E2E server: isolated on `http://localhost:3100/`.

## Failure Modes

- Stale dev server can show old YAML content; E2E uses an isolated port to avoid this.
- Missing provider keys should skip provider auth self-tests, not fail local validation.
