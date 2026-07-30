# AI Product Quest Visual Contract

This file is the mandatory visual contract for Codex, Claude Code, Open Design, and any other agent working on AI Product Quest.

AI Product Quest is a minimalist interactive text game where the computer talks to the user and teaches AI product thinking through short questions, small experiments, and consequences.

## Product Shape

- The application always occupies exactly one viewport.
- The background is almost unchanged across the whole episode.
- One screen contains one thought, one question, one diagram, one object, or one action.
- The interface is built around text, pauses, rhythm, and system reaction.
- Most of the screen remains empty.
- Previous speech disappears before the next speech appears.
- Normal vertical page scrolling is absent in the MVP.
- Gameplay has no website header, footer, sidebar, persistent navigation, or dashboard.
- Platform routes may use a minimal AppShell outside `/play`, but the play experience remains one viewport without website-style navigation.
- A minimal system topbar and small trace rail are allowed only as HUD state, not as navigation or dashboard UI.
- Codex is a hidden text layer over the same background, not a separate page or card catalog.
- The interface should feel like the user is talking to the system itself, not an app.

## Forbidden Patterns

Do not add:

- hero sections;
- landing page sections;
- feature cards;
- bento grids;
- carousels;
- decorative panels;
- SaaS dashboards;
- LMS screens;
- permanent particles;
- permanent 3D scenes;
- product chrome that stays visible during the whole episode.

Any visible element must do at least one of these jobs:

- communicate system state;
- help the player understand the learning principle;
- show the result of a user action;
- support the rhythm of the dialogue.

If an element only makes the screen look more impressive, remove it.

If a new element can be removed without losing the player's understanding of what is happening, remove it.

## Visual Stack

Use:

- Next.js;
- React;
- TypeScript;
- Tailwind CSS;
- Motion, imported from `motion/react`, as the primary animation library;
- React Bits only as a source for individual copied or adapted effects;
- Claude Directory only as a source for isolated visual experiments and prompts;
- Open Design through this `DESIGN.md` contract and local agent workflows.

Do not use in the MVP:

- ready-made landing templates;
- SaaS component kits;
- Magic UI;
- Velora UI;
- React Three Fiber;
- Drei;
- Triplex;
- Theatre.js;
- tsParticles;
- permanent 3D scenes;
- bento grids;
- dashboard layouts;
- card-based screen composition.

## Source Adaptation Rules

### Claude Directory

Use Claude Directory only for calm, isolated visual ideas such as:

- dark procedural backgrounds;
- GLSL-like gradients or fields adapted to CSS;
- soft noise;
- subtle glow;
- text animation;
- loaders;
- transitions;
- decoding effects;
- rare system failure states.

Never copy a whole landing page, hero composition, navbar, feature section, dashboard, or first-screen layout from Claude Directory.

When adapting an experiment, strip it down to the fullscreen effect only. The effect must stay quiet, nearly invisible, and subordinate to the text.

### React Bits

Use no more than two noticeable React Bits-style effects in one episode.

Allowed effect categories:

- text reveal;
- type-like character appearance;
- blur and dissolve;
- decoding text;
- word highlight;
- rare glitch;
- calm background motion.

Forbidden effect categories:

- bento grids;
- bright cards;
- carousels;
- decorative panels;
- 3D objects for decoration;
- site-hero compositions.

Every copied or adapted effect must be local code, reviewed, simplified, and renamed to match AI Product Quest.

### Motion

Motion controls the rhythm of the conversation:

- scene entry and exit;
- text appearance;
- delays between lines;
- answer option appearance;
- system reaction after choices;
- concept unlocks;
- rare failure pulses;
- reduced-motion support.

Animation must not decorate the interface. It should create reading rhythm and make the system feel responsive.

## Living System Rules

- The computer may breathe through a blinking cursor, slow glow drift, rare system-line flicker, and a soft pulse on the active command.
- The bottom step rail is narrative state, not a course-progress widget. It should name the current case step when that helps orientation.
- Choice rows are commands. Use labels such as `ДЕЙСТВИЕ` and numbered command rows.
- A small status readout may show states such as `ОЖИДАЕТ ВЫБОР`, `ПРОВЕРКА...`, `КОНТЕКСТ ОТКРЫТ`, or `ДОСТУП К ПАМЯТИ`.
- Transient system messages may appear after decisions, but only briefly and only when they communicate a reaction.
- A state change should feel like a machine process: choices disappear, `ПРОВЕРКА...` appears, then the next state replaces the current one.
- Keyboard hints are allowed only as quiet system help and must never become a menu.
- Sound is optional, quiet, non-musical, and must never be required for understanding.
- Codex appears as system memory access: `ОТКРЫВАЮ ПАМЯТЬ...`, then `CODEX`, then unlocked entries.
- Avoid episode terminology in the in-game HUD. Prefer case terms: дело, инцидент, решение, проверка, след, источник, вывод.

## Current MVP Effects Budget

The current MVP uses two noticeable effects:

1. Text line reveal, adapted from the React Bits text-animation category.
2. Rare system glitch on error states, adapted as a quiet CSS failure pulse.

The background uses a calm procedural noise/glow field inspired by Claude Directory shader and loader experiments. It is not a particle system, not a 3D scene, and not a landing-page hero background.

## Layout Rules

- Root game shell uses `height: 100dvh` and `overflow: hidden`.
- Content is centered in a narrow reading column.
- Choices appear only when the current scene needs action.
- Active choices use numbered terminal rows, visible focus, and keyboard navigation.
- Minimal HUD text may show product name, case id, active case summary, system time, status, and case step rail.
- Text size must be responsive without creating horizontal or vertical overflow.
- The interface must remain usable at 320x568.
- `prefers-reduced-motion` must remove decorative movement and shorten transitions.

## Copy Rules

- Short sentences.
- No article blocks.
- No explanatory cards.
- No "learn more" copy.
- No marketing value propositions.
- The system speaks directly through the screen.
- The user should feel the principle before reading its definition.

## Review Checklist

Before shipping any visual change, verify:

- one viewport;
- one active thought;
- no dashboard or landing-page pattern;
- no persistent menu;
- no website-style nav even when the system topbar is present;
- active choice is obvious from hover, focus, and keyboard state;
- trace state is readable in under one second;
- no decorative-only elements;
- no normal page scroll;
- Codex remains an overlay;
- Motion is used from `motion/react`;
- no more than two noticeable React Bits-style effects in the episode;
- background effect is calm and does not compete with the text.
