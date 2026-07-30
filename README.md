# AI Product Quest

Минималистичная образовательная игра-платформа про AI Product Engineering. MVP реализует только `Chapter 01` как вертикальный срез внутри целевой архитектуры:

```text
Platform → Season → Chapter → Scene
```

Игра строится не как лендинг, LMS или SaaS-панель, а как интерфейс компьютерной системы, которая ведёт пользователя через расследование. Первый запуск начинается с пролога First Contact with Zero, затем переходит в Chapter 01.

## Stack

- Next.js 16 / React 19 / TypeScript
- Tailwind CSS 4
- Motion (`motion/react`)
- YAML + JSON Schema validation
- Vinext runtime/build
- Node test runner + Playwright

Backend, авторизация, платежи, AI-чат и внешняя база в MVP не используются.

## Run

```bash
npm install
npm run dev
```

Локальный адрес: `http://localhost:3000/`.

## Tests

Быстрые проверки:

```bash
npm run typecheck
npm run lint
npm test
```

Браузерный playthrough:

```bash
npm run test:e2e
```

Визуальные QA-снимки Chapter 01 при запущенном dev-сервере:

```bash
npm run qa:chapter01:screens
```

Полная foundation-проверка:

```bash
npm run test:foundation
```

## Route Contract

- `/` — главная / продолжить кампанию;
- `/journey` — карта сезона и глав;
- `/play/[chapterId]` — запуск и прохождение главы;
- `/codex` — Codex;
- `/artifacts` — инженерные артефакты;
- `/profile` — профиль AI Product Engineer.

Legacy-маршруты `/episode`, `/museum`, `/competencies` не входят в контракт.

## Sources Of Truth

- `content/` — YAML-контент платформы, сезона, глав, сцен, Codex и артефактов;
- `schemas/` — JSON Schema для контента и состояния;
- `docs/` — продуктовые и архитектурные решения;
- `docs/claude_handoff.md` — краткий handoff для продолжения работы с Claude;
- `DESIGN.md` — обязательный визуальный контракт;
- `REPOSITORY_RULES.md` — правила изменения репозитория.
- `.ai/` и `.ai-ops.yaml` — установленный AI Ops Kit child-layer для workflow, gates, agents и runtime prompts.

Не хранить игровой контент в TypeScript-массивах.

## AI Ops Kit

В проект установлен AI Ops Kit `3.7.3` из `aleksandradovgopolova-boop/ai-ops-kit`.

Полезные проверки:

```bash
npm run ai:status
npm run ai:validate
```

Управление установкой через parent installer:

```bash
python3 <path-to-ai-ops-kit>/installer/ai_ops.py doctor
python3 <path-to-ai-ops-kit>/installer/ai_ops.py validate
python3 <path-to-ai-ops-kit>/installer/ai_ops.py status
```

Codex prompts сгенерированы в `.ai/generated/codex/prompts/`. Глобальная установка в `$CODEX_HOME/prompts` не выполнялась, потому что `CODEX_HOME` в окружении не задан.

Проектный AI Ops context живёт в `.ai/project/`:

- `.ai/project/RepositoryProfile.yaml`;
- `.ai/project/context/product/`;
- `.ai/project/context/system/`;
- `.ai/project/context/team/`;
- `.ai/project/contracts/events.yaml`;
- `.ai/project/quality-gates.yaml`.

## Runtime Architecture

- `app/` — маршруты приложения и CSS-зоны;
- `src/domain/campaign/` — каноническая модель CampaignState, событий, сцен, Evidence и Hypothesis;
- `src/application/` — orchestration services: запуск главы, выборы, persistence facade, content access;
- `src/engines/` — deterministic simulation, projection engine, Codex rules, artifact generation;
- `src/infrastructure/content/` — YAML loader + schema validation;
- `src/infrastructure/save/` — один save key и миграции legacy-сохранений;
- `src/platform/` — AppShell и платформенные views;
- `src/features/chapter-01/` — временный вертикальный adapter Chapter 01, view, keyboard и sound adapters;
- `tests/` — route contract, architecture boundaries, migrations, Golden Playthrough, deterministic simulation и browser E2E.

## State Model

История хранится как Event Log. `CampaignState`, Dashboard, Codex, профиль инженера и артефакты строятся как проекции событий.

Канонический ключ сохранения:

```text
ai-product-quest-campaign-v1
```

Legacy-ключи мигрируются и удаляются:

```text
ai-product-quest-flow-v1
ai-product-quest-mission-v2
ai-product-quest-progress
```

## Adding Content

До приёмки Chapter 01 Polish не добавлять Chapters 02-06.

Для будущей главы нужно:

1. Добавить YAML в `content/chapters/<chapter-id>/`.
2. Подключить главу в `content/seasons/season-01.yml`.
3. Обновить или добавить schemas, если меняется контракт.
4. Добавить Golden Playthrough.
5. Добавить browser E2E happy path.
6. Проверить Codex unlocks, artifacts, migrations and deterministic simulation.
7. Пройти `npm run test:foundation`.

## Current Scope

Реализовано:

- Chapter 01: `Дело №01: Непроверенный отчёт`;
- First Contact with Zero: пролог `zero-boot` → `chapter-title` → `mission-handoff`;
- bare-сцены с `advanceMode: any-input` для клавиши/тапа без кнопок;
- AppShell и целевая карта маршрутов;
- YAML content loader;
- Event Log + Projection Engine;
- migration path из старых save formats;
- Codex и artifact projections;
- architecture guardrails;
- browser playthrough Chapter 01.

Визуальные QA-снимки сохраняются в `.tmp/qa-screens/` и не входят в репозиторий.

Не реализовано:

- Chapters 02-06;
- серверное сохранение;
- редактор контента;
- авторизация;
- production analytics.
