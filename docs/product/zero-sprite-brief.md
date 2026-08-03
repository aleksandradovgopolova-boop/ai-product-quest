# Zero Sprite Brief

The game ships with a placeholder sheet at `src/features/chapter-01/view/assets/zero-sprite.png`.
Real art replaces that file and nothing else: the geometry, the row order, and the state logic are
fixed in `src/features/chapter-01/zeroState.ts`, and the component reads the sheet as one image.

## Hard contract

| Property | Value |
| --- | --- |
| Sheet | one PNG with transparency, `1152 × 1872` |
| Grid | 6 columns × 9 rows |
| Cell | `192 × 208` |
| Frames per state | 6, played in column order, looping |
| Loop | 1100 ms per state |
| Row order | `idle`, `speaking`, `waiting`, `thinking`, `right`, `wrong`, `decision`, `codex`, `closed` |
| Weight | under 320 KB — checked by `tests/zero-state.test.mts` |

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

Zero is drawn at character scale, not HUD-icon scale: 208 px on a wide desktop, 150 px on a short
one, 88–116 px on a phone. At that size the art carries detail — shading, silhouette, a readable
face — the way the Petdex pets do. The placeholder currently in the repository is deliberately crude
and will look poor at this size; that is what the real sheet fixes.

## Character

Zero is the system talking about itself, not a pet. It lives inside АКСИОМА and cannot see itself
from the inside — that is the whole reason the player was called in. Read: a small terminal creature,
a cursor with a face, an instrument. Not a mascot, not fur, not an animal with a drink.

The tone of the chapter is a night shift and a report that cannot be traced. Zero is calm, dry, and
slightly worn — it has been running for years and knows it is contradictory.

## The nine states and what each one must say

| Row | State | When it plays | What it must read as |
| --- | --- | --- | --- |
| 1 | `idle` | a line is on screen, nothing is asked | alive, breathing, waiting without pressure |
| 2 | `speaking` | while Zero's lines are revealing | the machine is producing speech |
| 3 | `waiting` | the player has answers on screen | attention turned to the player, a caret asking |
| 4 | `thinking` | `ПРОВЕРКА...` after a choice | working, checking, not yet answering |
| 5 | `right` | a verdict scene with `tone: success` | recognition, not celebration — Zero does not applaud |
| 6 | `wrong` | a verdict scene with `tone: error` | a fault inside the system: torn scanline, signal loss |
| 7 | `decision` | the decision readout with priced metrics | weight, consequence, something being committed |
| 8 | `codex` | the entry being written to memory | writing to storage, a block filling |
| 9 | `closed` | the case is over | still, dimmed, no motion — the sheet's animation is off for this row |

`closed` must read as a single static pose: the component stops the animation there.

The first frame of every row is what a player with `prefers-reduced-motion` sees forever, so frame 1
of each row has to carry the state on its own.

## Generating with agent-sprite-forge

The skill lives in Codex (`~/.codex/skills/`) and needs the built-in image generation, so it runs on
your side, not in this repository's CI.

Generate one action at a time — the skill explicitly refuses to mix actions in a single sheet —
then assemble the nine rows into the final `1152 × 1872` atlas in row order above.

Per action, ask for: 6 frames, a `2x3` grid, pixel art, side view, solid `#FF00FF` background,
subject fully inside the central safe area, consistent body scale across frames, `align=center`
(this character has no feet to stand on), `component_mode=largest`.

Run the post-processor with `--cell-size 192x208` and `scale_strategy=preserve` so all nine actions
share one scale — `fit` normalises each frame separately and the head will visibly breathe between
states.

Then drop the assembled PNG over the placeholder and run `npm run test:foundation`. If the geometry
changed, the only file to touch is `zeroSpriteSheet` in `src/features/chapter-01/zeroState.ts`.

## What not to do

- No extra rows "for later": the component maps rows by index, and an unused row is dead weight.
- No per-frame PNGs or GIFs in the app — one sheet, one request, one layer.
- No outline glow baked into the art: glow is the page's job and doubles up badly on a dark ground.
- No text or numbers inside the sprite — it must stay readable at 88 px on a phone.
