import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { advanceToScene, createInitialCampaignState, runChoice } from "../src/application/chapter-runner/chapterRunner";
import { confirmCapability } from "../src/application/chapter-runner/productRunner";
import { activeTriggers, pickLine, selectZeroReaction } from "../src/engines/zero/selectZeroReaction";
import { zeroSpriteSheet } from "../src/features/chapter-01/zeroState";
import { loadGameContent } from "../src/infrastructure/content/contentLoader";
import type { CampaignState, PlatformContent, ZeroReaction } from "../src/domain/campaign/types";

const at = "2026-08-05T09:00:00.000Z";
const root = path.resolve(new URL("..", import.meta.url).pathname);

function build(content: PlatformContent, selections: string[][]): CampaignState {
  let state = createInitialCampaignState(content, "chapter-01", at);

  for (const sceneId of ["01_zero_arrives"]) {
    state = advanceToScene({ content, state, sceneId, occurredAt: at });
  }

  state = runChoice({ content, state, choiceIdOrIndex: "i-am-here", occurredAt: at });
  state = advanceToScene({ content, state, sceneId: "01_belief", occurredAt: at });
  state = runChoice({ content, state, choiceIdOrIndex: "belief-problem", occurredAt: at });

  for (const optionIds of selections) {
    state = confirmCapability({ content, state, optionIds, occurredAt: at });
  }

  return state;
}

function react(content: PlatformContent, state: CampaignState, humor: "minimal" | "normal" | "maximum" = "normal") {
  const chapter = content.chapterById["chapter-01"];

  return selectZeroReaction({
    chapter,
    scene: chapter.sceneById[state.currentSceneId],
    product: state.product,
    isProcessing: false,
    humor,
  });
}

test("ZERO reads the product, not the scene it is standing in", () => {
  const content = loadGameContent();
  const state = build(content, [["scattered-information"], ["one-answer"], ["retrieve"]]);
  const chapter = content.chapterById["chapter-01"];
  const triggers = activeTriggers({
    chapter,
    scene: chapter.sceneById[state.currentSceneId],
    product: state.product,
    isProcessing: false,
  });

  // The build scene is on its context question, and nothing sharper is live yet.
  assert.equal(triggers.includes("build.context"), true);
  assert.equal(react(content, state)?.reaction.id, "pick-context");
});

test("an overloaded budget outranks the question being asked", () => {
  const content = loadGameContent();
  const overloaded = build(content, [["scattered-information"], ["one-answer"], ["retrieve"], ["everything"]]);

  assert.equal(overloaded.product.configuration.contextOverflow > 0, true);
  assert.equal(react(content, overloaded)?.reaction.id, "context-overload");
  assert.equal(react(content, overloaded)?.line, "А архив за 2007 год? Ну вдруг пригодится.");
});

test("a slot filled with options that carry nothing reads as an empty slot", () => {
  const content = loadGameContent();
  const chapter = content.chapterById["chapter-01"];
  // "без инструментов" provides nothing, so the product has tools selected and no capability.
  const state = build(content, [["scattered-information"], ["one-answer"], ["retrieve"], ["user-request"], ["no-tools"]]);
  const triggers = activeTriggers({
    chapter,
    scene: chapter.sceneById[state.currentSceneId],
    product: state.product,
    isProcessing: false,
  });

  assert.equal(triggers.includes("tools.none"), true);
  assert.equal(react(content, state)?.reaction.id, "no-tools");
});

test("acting without being asked outranks everything except the system thinking", () => {
  const content = loadGameContent();
  const state = build(content, [
    ["scattered-information"],
    ["one-answer"],
    ["act"],
    ["everything"],
    ["send-message"],
    ["no-boundaries"],
  ]);
  const chapter = content.chapterById["chapter-01"];

  // Three sharp conditions are live at once; the sharpest observation wins.
  const triggers = activeTriggers({
    chapter,
    scene: chapter.sceneById[state.currentSceneId],
    product: state.product,
    isProcessing: false,
  });
  assert.equal(triggers.includes("run.unbounded"), true);
  assert.equal(triggers.includes("context.overflow"), true);
  assert.equal(triggers.includes("boundaries.none"), true);
  assert.equal(react(content, state)?.reaction.id, "acted-unasked");

  // Processing is the one thing that outranks it: ZERO cannot comment while still counting.
  const thinking = selectZeroReaction({
    chapter,
    scene: chapter.sceneById[state.currentSceneId],
    product: state.product,
    isProcessing: true,
    humor: "normal",
  });
  assert.equal(thinking?.reaction.id, "processing");
});

test("humour picks a quieter line rather than inventing one", () => {
  const reaction = {
    id: "test",
    trigger: "chapter.opening",
    priority: 1,
    sprite: "idle",
    gesture: "still",
    position: "bottom-left",
    lines: { minimal: "тихо", normal: "как есть" },
  } satisfies ZeroReaction;

  assert.equal(pickLine(reaction, "minimal"), "тихо");
  assert.equal(pickLine(reaction, "normal"), "как есть");
  // Nothing is written for maximum, so it falls back rather than going silent.
  assert.equal(pickLine(reaction, "maximum"), "как есть");

  const quiet = { ...reaction, lines: { minimal: "только по делу" } } satisfies ZeroReaction;
  assert.equal(pickLine(quiet, "maximum"), "только по делу");
});

test("minimal never borrows a joke from a louder level", () => {
  const content = loadGameContent();
  const overloaded = build(content, [["scattered-information"], ["one-answer"], ["retrieve"], ["everything"]]);

  assert.equal(react(content, overloaded, "minimal")?.line, "Контекста больше, чем продукт успевает разобрать.");
  assert.equal(react(content, overloaded, "maximum")?.line, "Ты сейчас продукт собираешь или в «Магнит» голодная зашла?");
});

test("every reaction stands on a row the sheet actually has, in a position that is safe", () => {
  const content = loadGameContent();
  const catalogue = content.chapterById["chapter-01"].zero;
  const rows = new Set(zeroSpriteSheet.states.map((state) => state.id));
  const positions = new Set(["bottom-left", "bottom-right", "side-left", "side-right", "center-edge"]);

  assert.ok(catalogue);

  for (const reaction of catalogue.reactions) {
    assert.ok(rows.has(reaction.sprite), `${reaction.id} uses a sprite row the sheet does not have`);
    assert.ok(positions.has(reaction.position), `${reaction.id} stands somewhere unsafe`);
  }

  assert.equal(catalogue.defaultHumor, "normal");
});

test("every trigger the engine can raise has something to say", async () => {
  const content = loadGameContent();
  const catalogue = content.chapterById["chapter-01"].zero;
  const schema = JSON.parse(await readFile(path.join(root, "schemas/zero.schema.json"), "utf8")) as {
    $defs: { trigger: { enum: string[] } };
  };
  const covered = new Set<string>(catalogue?.reactions.map((reaction) => reaction.trigger));
  const uncovered = schema.$defs.trigger.enum.filter((trigger) => !covered.has(trigger));

  // A trigger with no reaction is a condition the runtime can reach and ZERO cannot answer.
  assert.deepEqual(uncovered, []);
});

test("nothing the chapter says is also written inside a component", async () => {
  const content = loadGameContent();
  const chapter = content.chapterById["chapter-01"];
  // Everything the chapter says out loud: scene copy, prompts, answers, and ZERO's asides.
  const spoken = [
    ...chapter.scenes.flatMap((scene) => [
      ...scene.lines,
      ...(scene.prompt ?? []),
      ...(scene.choices ?? []).map((choice) => choice.label),
      ...(scene.capability?.steps ?? []).flatMap((step) => [step.prompt, step.confirmLabel ?? ""]),
    ]),
    ...(chapter.zero?.reactions ?? []).flatMap((reaction) => Object.values(reaction.lines)),
  ].filter((line) => line.length > 12);

  const offenders: string[] = [];

  for (const file of await collectFiles(path.join(root, "src/features"))) {
    if (!file.endsWith(".tsx") && !file.endsWith(".ts")) {
      continue;
    }

    const source = await readFile(file, "utf8");

    for (const line of spoken) {
      if (source.includes(line)) {
        offenders.push(`${path.relative(root, file)} repeats "${line}"`);
      }
    }
  }

  // HUD chrome may have its own words. What may not live here is the chapter's voice: move a
  // scene and its copy goes with it, because there is only one copy of it.
  assert.deepEqual(offenders, []);
});

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? collectFiles(entryPath) : [entryPath];
    }),
  );

  return files.flat();
}
