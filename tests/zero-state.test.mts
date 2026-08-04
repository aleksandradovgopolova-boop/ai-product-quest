import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { getZeroSpriteState, selectZeroState, speakingDurationMs, zeroSheetHeight, zeroSheetWidth, zeroSpriteSheet } from "../src/features/chapter-01/zeroState";
import { loadGameContent } from "../src/infrastructure/content/contentLoader";
import type { Scene } from "../src/domain/campaign/types";

const sheetPath = new URL("../src/features/chapter-01/view/assets/zero-sprite.png", import.meta.url);

const scene = (overrides: Partial<Scene> = {}): Scene => ({
  id: "test",
  stepIndex: 1,
  lines: ["строка"],
  ...overrides,
});

test("Zero's state is read from the system, never authored in content", async () => {
  const content = loadGameContent();
  const chapter = content.chapterById["chapter-01"];

  // A scene may not carry a pose: the sprite is a projection of state, not scene decoration.
  const sceneFields = new Set(chapter.scenes.flatMap((item) => Object.keys(item)));
  assert.equal(sceneFields.has("sprite"), false);
  assert.equal(sceneFields.has("zero"), false);

  const schema = await readFile(new URL("../schemas/scene.schema.json", import.meta.url), "utf8");
  assert.doesNotMatch(schema, /sprite|zeroState/);
});

test("every runtime situation maps to a state that exists in the sheet", () => {
  const cases: Array<[string, ReturnType<typeof selectZeroState>]> = [
    ["processing wins over everything", selectZeroState({ scene: scene({ tone: "error" }), isProcessing: true })],
    ["error verdict", selectZeroState({ scene: scene({ tone: "error" }), isProcessing: false })],
    ["codex write", selectZeroState({ scene: scene({ tone: "codex" }), isProcessing: false })],
    ["priced decision", selectZeroState({ scene: scene({ showEffects: true }), isProcessing: false })],
    ["success verdict", selectZeroState({ scene: scene({ tone: "success" }), isProcessing: false })],
    ["waiting for an answer", selectZeroState({ scene: scene({ choices: [{ id: "a", label: "A", nextSceneId: "b" }] }), isProcessing: false })],
    ["quiet line", selectZeroState({ scene: scene(), isProcessing: false })],
  ];

  assert.deepEqual(
    cases.map(([, state]) => state),
    ["thinking", "wrong", "codex", "decision", "right", "waiting", "idle"],
  );

  for (const [label, state] of cases) {
    assert.ok(
      zeroSpriteSheet.states.some((item) => item.id === state),
      `${label} produced a state missing from the sheet`,
    );
  }
});

test("a scene whose every choice leaves the chapter closes the case", () => {
  const content = loadGameContent();
  const leaving = content.chapterById["chapter-01"].sceneById["belief-ack"];

  assert.equal(selectZeroState({ scene: leaving, isProcessing: false }), "closed");

  // A mixed scene is still a question, not an ending.
  const mixed = scene({
    choices: [
      { id: "leave", label: "Открыть артефакт", action: "artifacts" },
      { id: "stay", label: "Дальше", nextSceneId: "next" },
    ],
  });
  assert.equal(selectZeroState({ scene: mixed, isProcessing: false }), "waiting");
});

test("speaking lasts as long as the lines take to appear", () => {
  assert.equal(speakingDurationMs({ lineCount: 0, lineDelayMs: 80 }), 0);
  assert.equal(speakingDurationMs({ lineCount: 3, lineDelayMs: 80 }), 660);
  // Reduced motion reveals every line at once, so Zero only speaks for the tail.
  assert.equal(speakingDurationMs({ lineCount: 3, lineDelayMs: 0 }), 420);
});

test("the sheet is the only binary asset and stays inside its weight budget", async () => {
  const info = await stat(sheetPath);

  // The whole playable build is a few hundred KB; a sprite sheet that outgrows this budget
  // stops being a HUD detail and starts being the page.
  assert.ok(info.size < 320_000, `sprite sheet is ${Math.round(info.size / 1024)} KB`);
});

test("the sheet on disk matches the contract the CSS animates against", async () => {
  // The renderer slices the image by row and column count. If the drawing and the contract
  // ever disagree, every frame lands off-centre and nothing else in the build notices —
  // so the real pixels are measured here.
  const png = await readFile(sheetPath);

  assert.equal(png.subarray(12, 16).toString("ascii"), "IHDR");
  assert.equal(png.readUInt32BE(16), zeroSheetWidth, "sheet width");
  assert.equal(png.readUInt32BE(20), zeroSheetHeight, "sheet height");
  assert.equal(zeroSheetWidth, 1536, "the grid stays Petdex-compatible: 8 columns of 192px");
});

test("every state fits the grid and keeps its own rhythm", () => {
  const rows = zeroSpriteSheet.states.map((state) => state.row);

  // Rows are addressed by index, so they must be a dense sequence with no gaps or repeats.
  assert.deepEqual(rows, [...rows].sort((first, second) => first - second));
  assert.deepEqual(rows, Array.from({ length: rows.length }, (_, index) => index));

  for (const state of zeroSpriteSheet.states) {
    assert.ok(state.frames >= 1 && state.frames <= zeroSpriteSheet.columns, `${state.id} uses ${state.frames} frames`);
    assert.ok(state.durationMs >= 0, `${state.id} has a negative loop`);
  }

  // A single-frame state is a pose, not an animation; it must not carry a loop.
  const closed = getZeroSpriteState("closed");
  assert.equal(closed.frames, 1);
  assert.equal(closed.durationMs, 0);

  // Frame counts differ on purpose: a verdict does not need the frames a fault does.
  assert.notEqual(getZeroSpriteState("right").frames, getZeroSpriteState("wrong").frames);
});
