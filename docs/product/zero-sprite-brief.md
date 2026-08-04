# ZERO Sprite Brief

The game ships with a placeholder sheet at `src/features/chapter-01/view/assets/zero-sprite.png`.
Real art replaces that file and nothing else: the geometry, the row order, and the state logic are
fixed in `src/features/chapter-01/zeroState.ts`, and the component reads the sheet as one image.

## Hard contract

| Property | Value |
| --- | --- |
| Sheet | one PNG with transparency, `1536 × 1872` |
| Grid | 8 columns × 9 rows |
| Cell | `192 × 208` |
| Frames per state | between 1 and 8, played left to right; the unused tail of a row stays empty |
| Loop | per state, see the table below |
| Weight | under 320 KB — checked by `tests/zero-state.test.mts` |

The grid is 8 columns because that is the geometry the Petdex atlases use (`1536 × 1872` for
nine states, `1536 × 2288` for eleven). Staying compatible means a sheet drawn for one can be
read by the other, and tools built around that atlas — including the ChatGPT pet export — can
produce rows for ZERO without resizing anything.

`tests/zero-state.test.mts` reads the real PNG header and fails the build if its width or
height stops matching the contract, so a sheet and a renderer cannot silently drift apart.

The subject must stay inside the central ~70% of every cell: the sprite is rendered at 88–208 px, so
it reads as a character rather than an icon, and anything touching a cell edge will clip. Anchor the body consistently across frames — a drifting
baseline reads as jitter at this size.

## Palette

Only the game's own colours. There is no red in this product: an error is expressed by a torn
scanline and crossed eyes, not by hue.

- accent / life: `#7fffd4`
- light: `#eaeaea`
- muted: `#8a8a8a`
- shell interior: near-black, the page behind it is `#090909`
- background: fully transparent

## Scale

ZERO is drawn at character scale, not HUD-icon scale: 208 px on a wide desktop, 150 px on a short
one, 88–116 px on a phone. At that size the art carries detail — shading, silhouette, a readable
face — the way the Petdex pets do. The placeholder currently in the repository is deliberately crude
and will look poor at this size; that is what the real sheet fixes.

## Character

In the Petdex taxonomy this character is `terminal-life` by type and `focused` + `mischievous`
by vibe: collected, dry, quietly amused. Not `cozy`, not `kawaii`.

ZERO is the system talking about itself, not a pet. It lives inside AXIOM and cannot see itself
from the inside — that is the whole reason the player was called in. Read: a small terminal creature,
a cursor with a face, an instrument. Not a mascot, not fur, not an animal with a drink.

The tone of the chapter is a night shift and a report that cannot be traced. ZERO is calm, dry, and
slightly worn — it has been running for years and knows it is contradictory.

## The nine states and what each one must say

| Row | State | Frames | Loop | When it plays | What it must read as |
| --- | --- | --- | --- | --- | --- |
| 1 | `idle` | 6 | 1100 ms | a line is on screen, nothing is asked | alive, breathing, waiting without pressure |
| 2 | `speaking` | 6 | 900 ms | while ZERO's lines are revealing | the machine is producing speech |
| 3 | `waiting` | 6 | 1010 ms | the player has answers on screen | attention turned to the player, a caret asking |
| 4 | `thinking` | 8 | 1030 ms | `ПРОВЕРКА...` after a choice | working, checking, not yet answering |
| 5 | `right` | 5 | 840 ms | a verdict scene with `tone: success` | recognition, not celebration — ZERO does not applaud |
| 6 | `wrong` | 8 | 1220 ms | a verdict scene with `tone: error` | a fault inside the system: torn scanline, signal loss |
| 7 | `decision` | 6 | 1180 ms | the decision readout with priced metrics | weight, consequence, something being committed |
| 8 | `codex` | 6 | 1010 ms | the entry being written to memory | writing to storage, a block filling |
| 9 | `closed` | 1 | — | the chapter is over | a single held pose, no motion at all |

Frame counts differ on purpose. A fault needs eight frames to tear and recover; a verdict reads
in five; a held pose needs one. Drawing every row to eight frames wastes art and makes short
gestures feel slack. Row 9 is a single drawing — the renderer never animates it.

The numbers above are the contract: they live in `zeroSpriteSheet` in
`src/features/chapter-01/zeroState.ts` and are what the CSS steps through.

The first frame of every row is what a player with `prefers-reduced-motion` sees forever, so frame 1
of each row has to carry the state on its own.

## Generating with agent-sprite-forge

The skill lives in Codex (`~/.codex/skills/`) and needs the built-in image generation, so it runs on
your side, not in this repository's CI.

Generate one action at a time — the skill explicitly refuses to mix actions in a single sheet —
then assemble the nine rows into the final `1536 × 1872` atlas in row order above, left-aligned
in each row, leaving the unused columns transparent.

Per action, ask for the frame count from the table (6 frames → `2x3`, 8 frames → `2x4`,
5 frames → `2x3` with the last cell empty), pixel art, side view, solid `#FF00FF` background,
subject fully inside the central safe area, consistent body scale across frames, `align=center`
(this character has no feet to stand on), `component_mode=largest`.

Run the post-processor with `--cell-size 192x208` and `scale_strategy=preserve` so all nine actions
share one scale — `fit` normalises each frame separately and the head will visibly breathe between
states.

Then drop the assembled PNG over the placeholder and run `npm run test:foundation`. If the geometry
changed, the only file to touch is `zeroSpriteSheet` in `src/features/chapter-01/zeroState.ts`.

## What not to do

- No extra rows "for later": the component maps rows by index, and an unused row is dead weight.
- No filling a row to eight frames to "look complete": unused columns must stay transparent.
- No per-frame PNGs or GIFs in the app — one sheet, one request, one layer.
- No outline glow baked into the art: glow is the page's job and doubles up badly on a dark ground.
- No text or numbers inside the sprite — it must stay readable at 88 px on a phone.
