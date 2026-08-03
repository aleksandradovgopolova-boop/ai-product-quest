# Technical Architecture

## Sprint 0 Implementation Contract

The accepted product model is:

```text
Platform → Season → Chapter → Scene
```

The first platform slice contains only `chapter-01`. Routes, state, content, and tests must not assume Chapters 02-06 exist.

Content lives in root `content/` as YAML. `src/infrastructure/content/contentLoader.ts` validates YAML with JSON Schema from `schemas/` and converts it into runtime objects.

History lives as an Event Log. `CampaignState`, dashboard, Codex, artifacts, and the engineer profile are projections produced by `src/engines/projection/projectCampaign.ts`.

Gameplay code is separated into:

- `src/domain/campaign` — canonical model;
- `src/application/chapter-runner` — commands and orchestration;
- `src/engines/simulation` — deterministic rules;
- `src/engines/projection` — derived state;
- `src/engines/codex` — Codex projection helpers;
- `src/engines/artifact` — artifact generation;
- `src/infrastructure/content` — YAML loading and validation;
- `src/infrastructure/save` — one save key and migrations;
- `src/features/chapter-01` — temporary vertical adapter and view components.

Sprint 0.5 adds architecture guardrails in `tests/architecture-boundaries.test.mts`. These tests are part of `npm test` and enforce the layer boundaries documented in `docs/architecture/dependency-graph.md`.

Sprint 0.5 also adds browser playthrough coverage in `tests/e2e/chapter-01.spec.ts`. That suite verifies the cold open on the incident, Chapter 01 happy path, keyboard navigation, reset/replay, Codex persistence, artifact projection, and mobile viewport integrity.

## 1. Архитектурная цель

Создать content-driven веб-приложение, в котором общий игровой движок
исполняет шесть глав, описанных конфигурацией.

## 2. Рекомендуемый стек

### Frontend

- TypeScript;
- React;
- Next.js;
- CSS Modules, Tailwind CSS или единая компонентная система;
- Zod или JSON Schema для runtime-валидации.

### Backend

Для первого вертикального среза допустим Next.js server layer.

При росте сложности:

- отдельный API;
- Python/FastAPI или TypeScript backend;
- PostgreSQL;
- объектное хранилище для экспортов.

### Тестирование

- Node test runner / `tsx --test` for route, architecture, content, migration, projection, and simulation contracts;
- Playwright for browser playthroughs;
- JSON Schema validation for content and state.

## 3. Логические слои

```text
UI
↓
Application Services
↓
Game Engines
↓
Domain Model
↓
Content Repository / Event Store / Persistence
```

### UI

Отвечает за:

- отображение;
- ввод пользователя;
- навигацию;
- доступность;
- анимации.

Не содержит правил главы или симуляции.

### Application Services

Координируют сценарии:

- начать сцену;
- открыть доказательство;
- принять решение;
- выполнить симуляцию;
- завершить сцену;
- сформировать артефакт.

### Game Engines

Независимые модули:

- Dialogue Engine;
- Investigation Engine;
- Decision Engine;
- Simulation Engine;
- Incident Engine;
- Dashboard Engine;
- Codex Engine;
- Artifact Engine;
- Progression Engine;
- Save Engine.

### Domain Model

Основные сущности:

- Campaign;
- Chapter;
- Scene;
- Evidence;
- Hypothesis;
- Decision;
- DecisionOption;
- SystemState;
- Metric;
- Event;
- Axiom;
- Artifact;
- EngineerProfile.

### Infrastructure

- загрузка контента;
- хранение событий;
- сохранения;
- экспорт;
- логирование;
- внешние AI-вызовы, если появятся.

## 4. Текущая структура приложения

```text
app/
  page.tsx
  journey/
  play/[chapterId]/
  codex/
  artifacts/
  profile/
  styles/
content/
  platform.yml
  seasons/
  chapters/chapter-01/
  codex/
  artifacts/
schemas/
src/
  application/
  domain/
    campaign/
  engines/
    simulation/
    projection/
    codex/
    artifact/
  features/chapter-01/
  infrastructure/
    content/
    save/
  platform/
tests/
```

`content/` остаётся вне `src/` и является YAML source of truth. UI не читает YAML напрямую; доступ к контенту идёт через loader/application слой.

## 5. Модель состояния

### CampaignState

Минимальные поля:

```ts
type CampaignState = {
  schemaVersion: string;
  campaignId: string;
  seed: string;
  currentChapterId: string;
  currentSceneId: string;
  openedEvidenceIds: string[];
  decisions: DecisionRecord[];
  systemState: SystemState;
  unlockedAxiomIds: string[];
  artifactIds: string[];
  engineerProfile: EngineerProfile;
  updatedAt: string;
};
```

### SystemState

```ts
type SystemState = {
  usefulness: number;
  quality: number;
  latency: number;
  cost: number;
  trust: number;
  resilience: number;
  adaptability: number;
  maintainability: number;
  observability: number;
  security: number;
  technicalDebt: number;
  organisationalDebt: number;
};
```

Диапазоны и направление «лучше/хуже» должны быть описаны в одном месте.

## 6. Event Log

Рекомендуемый формат события:

```ts
type GameEvent = {
  id: string;
  campaignId: string;
  type: string;
  version: number;
  occurredAt: string;
  chapterId?: string;
  sceneId?: string;
  payload: unknown;
  causationId?: string;
  correlationId?: string;
};
```

Текущий каталог событий живёт в `.ai/project/contracts/events.yaml`.

Канонические события MVP:

- `campaign.started`;
- `chapter.started`;
- `scene.entered`;
- `choice.submitted`;
- `decision.submitted`;
- `codex.entry_unlocked`;
- `artifact.generated`;
- `legacy.save_migrated`;
- `campaign.reset_completed`.

Legacy-совместимость:

- `campaign.reset` маппится на `campaign.reset_completed` и не должен эмититься новым кодом.

## 7. Simulation Engine

Вход:

- текущее состояние;
- решение;
- активные ограничения;
- события мира;
- версия правил;
- seed.

Выход:

- новое состояние;
- список изменений;
- причинные связи;
- новые риски;
- созданные события;
- доступные следующие шаги.

Правила симуляции должны быть чистыми функциями, где это возможно.

## 8. Контентная модель

Глава содержит:

- метаданные;
- список сцен;
- доступные механики;
- условия открытия;
- boss;
- артефакт;
- ссылки на аксиомы.

Сцена содержит:

- вступление;
- цели;
- доказательства;
- условия доступности;
- диалоги;
- решения;
- правила завершения.

Не хранить в Markdown критические машинные правила.
Для машинных данных использовать YAML или JSON, валидируемые схемой.

## 9. Persistence

### MVP

Допустимо:

- локальное сохранение в IndexedDB;
- экспорт и импорт сохранения как JSON.

### Следующий этап

- серверная учётная запись;
- PostgreSQL;
- синхронизация между устройствами;
- несколько кампаний;
- журнал версий.

Слой persistence должен быть заменяемым.

## 10. Экспорт артефактов

Пайплайн:

```text
Campaign Events
→ Artifact Projection
→ Artifact Model
→ Markdown / HTML
→ Print / PDF
```

Экспорт не должен читать UI-состояние напрямую.

## 11. Генеративный AI

Для первого вертикального среза генеративный AI не обязателен.

Если он добавляется:

- AI используется через абстракцию provider;
- есть детерминированный fallback;
- prompt и версия модели журналируются;
- внешняя модель не изменяет каноническое состояние напрямую;
- результат проходит валидацию;
- пользователь понимает, какие данные отправляются наружу.

## 12. Feature Flags

Флаги допустимы для:

- генеративного Zero;
- расширенной симуляции;
- PDF-экспорта;
- серверного сохранения;
- экспериментальных Dashboard.

Флаги не должны подменять нормальную модульность.

## 13. Ошибки и восстановление

Обязательные сценарии:

- повреждённый контент;
- несовместимая версия сохранения;
- ошибка симуляции;
- ошибка экспорта;
- недоступный AI-провайдер;
- прерванное сохранение.

Приложение должно сохранять последнее корректное состояние.

## 14. Наблюдаемость

Минимальные события аналитики:

- старт кампании;
- старт и завершение сцены;
- открытие доказательства;
- отказ от решения;
- подтверждение решения;
- повтор сцены;
- экспорт артефакта;
- ошибка.

Не записывать свободный текст игрока без необходимости.

## 15. Тестовая стратегия

### Unit

- правила симуляции;
- условия открытия;
- расчёт профиля;
- проекции Dashboard;
- генерация артефакта;
- миграции сохранений.

### Integration

- глава загружается и валидируется;
- решение создаёт события;
- события обновляют проекции;
- сохранение восстанавливает состояние.

### End-to-End

- новая кампания;
- полное прохождение Chapter 01;
- перезагрузка приложения;
- восстановление прогресса;
- экспорт Assistant Blueprint.

## 16. Architecture Decision Records

Все значимые решения оформляются в `docs/adr/`.

Принятые ADR:

- ADR-0001: Platform Route Contract;
- ADR-0002: Campaign State and Event Log;
- ADR-0003: YAML Content Source;
- ADR-0004: Save Migrations;
- ADR-0005: Projection Model;
- ADR-0006: Chapter 01 Vertical Adapter;
- ADR-0007: Developer Experience Guardrails;
- ADR-0008: AI Ops Child Layer.

## 17. Definition of Done для архитектуры

Архитектура готова к реализации, если:

- границы слоёв зафиксированы;
- схемы основных сущностей существуют;
- контент Chapter 01 валидируется;
- Simulation Engine имеет формальный интерфейс;
- persistence заменяем;
- артефакты строятся из событий;
- описаны миграции состояния;
- есть тестовый план;
- Codex не должен додумывать критическую продуктовую логику.
