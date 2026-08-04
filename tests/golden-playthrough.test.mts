import assert from "node:assert/strict";
import test from "node:test";
import { advanceToScene, createInitialCampaignState, interpolateLines, runChoice } from "../src/application/chapter-runner/chapterRunner";
import { changeComponent, confirmCapability, confirmRebuild, runTests } from "../src/application/chapter-runner/productRunner";
import { loadGameContent } from "../src/infrastructure/content/contentLoader";
import type { CampaignState, PlatformContent } from "../src/domain/campaign/types";

const at = "2026-08-04T09:00:00.000Z";

/** One run through the whole chapter: enter, choose a person, build, test, rebuild, launch. */
function play(content: PlatformContent) {
  let state = createInitialCampaignState(content, "chapter-01", at);

  for (const sceneId of ["01_zero_arrives", "01_zero_intro", "01_belief"]) {
    state = advanceToScene({ content, state, sceneId, occurredAt: at });
  }

  state = runChoice({ content, state, choiceIdOrIndex: "belief-problem", occurredAt: at });
  state = confirmCapability({ content, state, optionIds: ["scattered-information"], occurredAt: at });
  state = confirmCapability({ content, state, optionIds: ["one-answer"], occurredAt: at });
  state = confirmCapability({ content, state, optionIds: ["retrieve"], occurredAt: at });
  state = confirmCapability({ content, state, optionIds: ["user-request", "internal-docs"], occurredAt: at });
  state = confirmCapability({ content, state, optionIds: ["read-docs"], occurredAt: at });
  state = confirmCapability({ content, state, optionIds: ["cite-sources"], occurredAt: at });

  return state;
}

test("Golden Playthrough builds a product and carries it to launch", () => {
  const content = loadGameContent();
  let state = play(content);

  assert.equal(state.dashboard.chapterTitle, "Глава I: Создать");
  assert.equal(state.dashboard.totalStages, 5);
  assert.equal(state.variables.belief, "проблема человека");

  // The build is finished: the product exists at version 1 and the chapter has moved to the run.
  assert.equal(state.currentSceneId, "04_test");
  assert.equal(state.product.configuration.version, 1);
  assert.equal(state.product.configuration.problemId, "scattered-information");
  assert.deepEqual(state.product.configuration.contextItemIds, ["user-request", "internal-docs"]);

  // Three scenarios ran against it, and the readings are attributable rather than scored.
  const firstRun = state.product.firstRun;
  assert.equal(firstRun?.results.length, 3);
  assert.deepEqual(
    firstRun?.results.map((result) => result.band),
    ["served", "partial", "unserved"],
  );
  assert.deepEqual(
    firstRun?.results[0].attribution.carried.map((reference) => reference.optionId),
    ["user-request", "internal-docs", "read-docs"],
  );
  assert.deepEqual(
    firstRun?.results[2].attribution.missing.map((reference) => reference.optionId),
    ["send"],
  );

  state = runTests({ content, state, occurredAt: at });
  assert.equal(state.currentSceneId, "05_rebuild");

  state = changeComponent({ content, state, component: "tools", optionIds: ["read-docs", "send-message"], occurredAt: at });
  state = changeComponent({ content, state, component: "boundaries", optionIds: ["cite-sources", "confirm-before-send"], occurredAt: at });
  assert.equal(state.product.rebuild.changes.length, 2);

  state = confirmRebuild({ content, state, occurredAt: at });

  // The rebuild closes the chapter: the axiom is unlocked and the Blueprint is written.
  assert.equal(state.currentSceneId, "06_launch");
  assert.equal(state.product.configuration.version, 2);
  assert.deepEqual(state.unlockedCodexEntryIds, ["llm-not-product"]);
  assert.equal(state.artifacts.length, 1);
  assert.equal(state.eventLog.some((event) => event.type === "chapter.completed"), true);

  // Giving the product a way to send, and a rule about sending, changes the third reading.
  assert.deepEqual(
    state.product.latestRun?.results.map((result) => result.band),
    ["served", "partial", "served"],
  );
  assert.notDeepEqual(state.product.firstRun?.results[2].band, state.product.latestRun?.results[2].band);
});

test("Golden Playthrough projects six metrics and a Blueprint made of the player's decisions", () => {
  const content = loadGameContent();
  const state = play(content);

  assert.deepEqual(
    state.playerMetrics.metrics.map((metric) => metric.key),
    ["usefulness", "quality", "trust", "speed", "cost", "risk"],
  );
  assert.deepEqual(
    state.playerMetrics.metrics.map((metric) => metric.label),
    ["Полезность", "Качество", "Доверие", "Скорость", "Стоимость", "Риск"],
  );
  // Cost and risk are the two the player wants low; the HUD colours a delta by this.
  assert.deepEqual(
    state.playerMetrics.metrics.filter((metric) => metric.betterWhen === "lower").map((metric) => metric.key),
    ["cost", "risk"],
  );

  for (const metric of state.playerMetrics.metrics) {
    assert.ok(metric.value >= 0 && metric.value <= 100, `${metric.key} is off scale: ${metric.value}`);
  }

  const finished = confirmRebuild({
    content,
    state: runTests({ content, state, occurredAt: at }),
    occurredAt: at,
  });
  const blueprint = finished.artifacts[0].body;

  // Every section is a projection: the person, their words, and what the player chose for them.
  assert.match(blueprint, /## Пользователь\nИрина, вторая линия поддержки/);
  assert.match(blueprint, /Я каждый день трачу час, собирая информацию из пяти разных систем\./);
  assert.match(blueprint, /## Роль модели\nнаходить сведения/);
  assert.match(blueprint, /## Бюджет контекста\nПотрачено 3 из 4\. В пределах бюджета\./);
  assert.match(blueprint, /## С чего ты начинал\n«проблема человека»/);
  assert.match(blueprint, /## Что ты теперь знаешь\nLLM — не продукт/);
  assert.doesNotMatch(blueprint, /Решение ещё не принято/);
});

test("the answer the player gives comes back in ZERO's own line", () => {
  const content = loadGameContent();
  const state = play(content);
  const chapter = content.chapterById["chapter-01"];

  assert.deepEqual(interpolateLines(chapter.sceneById["02_problem"].lines, state.variables), [
    "Продукта ещё нет.",
    "Есть только люди, которым что-то мешает.",
    "«проблема человека» — запомнил. Посмотрим.",
  ]);
});

test("the same playthrough always produces the same log and the same product", () => {
  const content = loadGameContent();
  const first: CampaignState = play(content);
  const second: CampaignState = play(content);

  assert.deepEqual(first.eventLog, second.eventLog);
  assert.deepEqual(first.systemState, second.systemState);
  assert.deepEqual(first.playerMetrics, second.playerMetrics);
  assert.deepEqual(first.product, second.product);
});
