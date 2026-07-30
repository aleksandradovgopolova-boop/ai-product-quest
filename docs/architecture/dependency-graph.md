# Dependency Graph

Sprint 0.5 fixes the intended dependency direction for AI Product Quest.

```mermaid
graph TD
  Content["content/ YAML"] --> Loader["Infrastructure: Content Loader"]
  Schemas["schemas/ JSON Schema"] --> Loader

  App["App Routes"] --> Platform["Platform UI"]
  App --> AppQueries["Application Queries"]
  Platform --> AppServices["Application Services"]
  ChapterUI["Chapter 01 Adapter + View"] --> AppServices

  AppQueries --> Loader
  AppServices --> Domain["Domain Model"]
  AppServices --> Engines["Game Engines"]
  AppServices --> Persistence["Infrastructure: Save Adapter"]

  Engines --> Domain
  Loader --> Domain
  Persistence --> Domain

  Projection["Projection Engine"] --> Simulation["Simulation Engine"]
  Projection --> Artifact["Artifact Engine"]
  Projection --> Domain
```

## Allowed Direction

```text
UI → Application → Engines → Domain
UI → Application → Infrastructure
Infrastructure → Domain
Infrastructure → Application only when adapting legacy persistence
Content → Loader → Domain
```

## Guardrails

Automated checks live in `tests/architecture-boundaries.test.mts`.

They currently enforce:

- UI does not import `src/infrastructure`;
- Domain does not import application, engines, infrastructure, UI, or app routes;
- Domain does not use browser/runtime globals;
- Engines do not import UI, app routes, or infrastructure;
- `content/` stays data-only YAML;
- local source imports do not form cycles.

## Notes

`Chapter01Adapter` is allowed to be an adapter, but not an engine. If it starts accumulating branching rules, simulation, content constants, or projection logic, move that logic down into `src/application` or `src/engines`.
