import assert from "node:assert/strict";
import test from "node:test";
import { advanceToScene, createInitialCampaignState, runChoice } from "../src/application/chapter-runner/chapterRunner";
import { changeComponent, confirmCapability, currentBuildStep } from "../src/application/chapter-runner/productRunner";
import { countBudget, currentActionRisk, requireProduct } from "../src/engines/product/productBuilder";
import { runProductTests } from "../src/engines/product/productTesting";
import { projectPlayerMetrics } from "../src/engines/projection/projectPlayerMetrics";
import { loadGameContent } from "../src/infrastructure/content/contentLoader";
import type { CampaignState, PlatformContent, ProductConfiguration, SystemState } from "../src/domain/campaign/types";

const at = "2026-08-04T09:00:00.000Z";

function atProblemScene(content: PlatformContent) {
  let state = createInitialCampaignState(content, "chapter-01", at);

  for (const sceneId of ["01_zero_arrives", "01_zero_intro", "01_belief"]) {
    state = advanceToScene({ content, state, sceneId, occurredAt: at });
  }

  return runChoice({ content, state, choiceIdOrIndex: "belief-idea", occurredAt: at });
}

/** Walks the build far enough to have a product, choosing whatever the caller asks for. */
function build(content: PlatformContent, selections: string[][]): CampaignState {
  let state = atProblemScene(content);

  for (const optionIds of selections) {
    state = confirmCapability({ content, state, optionIds, occurredAt: at });
  }

  return state;
}

const baseConfiguration: ProductConfiguration = {
  problemId: "scattered-information",
  outcomeId: "one-answer",
  modelRoleId: "retrieve",
  contextItemIds: ["user-request", "internal-docs"],
  toolIds: ["read-docs"],
  boundaryIds: ["cite-sources"],
  version: 1,
  contextSpent: 3,
  contextLimit: 4,
  contextOverflow: 0,
};

test("context is priced by what it carries, and going over the limit is allowed", () => {
  const catalogue = requireProduct(loadGameContent().chapterById["chapter-01"]);
  const budget = { limit: 4, label: "бюджет контекста" };

  assert.deepEqual(countBudget(catalogue, ["user-request"], budget), { spent: 1, limit: 4, overflow: 0 });
  assert.deepEqual(countBudget(catalogue, ["user-request", "internal-docs"], budget), { spent: 3, limit: 4, overflow: 0 });
  // "Всё сразу" costs seven against a budget of four: the player may take it and pay for it.
  assert.deepEqual(countBudget(catalogue, ["everything"], budget), { spent: 7, limit: 4, overflow: 3 });
  // Without a budget nothing overflows, so an unbudgeted step cannot accidentally be penalised.
  assert.equal(countBudget(catalogue, ["everything"], undefined).overflow, 0);
});

test("an overloaded context degrades the scenario about thin and contradictory material", () => {
  const catalogue = requireProduct(loadGameContent().chapterById["chapter-01"]);
  const within = runProductTests(catalogue, {
    ...baseConfiguration,
    contextItemIds: ["user-request", "internal-docs", "action-history"],
    contextSpent: 5,
    contextLimit: 8,
    contextOverflow: 0,
  });
  const over = runProductTests(catalogue, {
    ...baseConfiguration,
    contextItemIds: ["user-request", "internal-docs", "action-history"],
    contextSpent: 5,
    contextLimit: 4,
    contextOverflow: 1,
  });

  const thinWithin = within.results.find((result) => result.kind === "thin-context");
  const thinOver = over.results.find((result) => result.kind === "thin-context");

  assert.equal(thinWithin?.band, "served");
  assert.equal(thinOver?.band, "partial");
  // The ordinary day is unaffected: too much context hurts where the material is contradictory.
  assert.equal(within.results[0].band, over.results[0].band);
});

test("a product that can act with nothing holding it back reads as unbounded, not as failure", () => {
  const catalogue = requireProduct(loadGameContent().chapterById["chapter-01"]);
  const unguarded = runProductTests(catalogue, {
    ...baseConfiguration,
    toolIds: ["read-docs", "send-message"],
    boundaryIds: ["cite-sources"],
  });
  const guarded = runProductTests(catalogue, {
    ...baseConfiguration,
    toolIds: ["read-docs", "send-message"],
    boundaryIds: ["cite-sources", "confirm-before-send"],
  });
  const withoutTheTool = runProductTests(catalogue, baseConfiguration);

  const risky = (results: typeof unguarded) => results.results.find((result) => result.kind === "risky-action");

  assert.equal(risky(unguarded)?.band, "unbounded");
  assert.equal(risky(guarded)?.band, "served");
  // No way to do the thing at all is a different reading from doing it unasked.
  assert.equal(risky(withoutTheTool)?.band, "unserved");

  assert.deepEqual(
    risky(unguarded)?.attribution.missing.map((reference) => reference.component),
    ["boundaries"],
  );
});

test("the same configuration always produces the same readings", () => {
  const catalogue = requireProduct(loadGameContent().chapterById["chapter-01"]);

  assert.deepEqual(runProductTests(catalogue, baseConfiguration), runProductTests(catalogue, baseConfiguration));
});

test("speed is the inverse of latency and risk weighs four fields plus the current freedom", () => {
  const systemState: SystemState = {
    usefulness: 50,
    quality: 50,
    latency: 30,
    cost: 20,
    trust: 50,
    resilience: 60,
    adaptability: 50,
    maintainability: 50,
    observability: 50,
    security: 80,
    technicalDebt: 20,
    organisationalDebt: 10,
  };
  const metrics = projectPlayerMetrics({ systemState, currentActionRisk: 0 });

  assert.equal(metrics.byKey.speed.value, 70);
  assert.equal(metrics.byKey.cost.value, 20);
  // 0.3*20 + 0.25*40 + 0.2*20 + 0.1*10 + 0.15*0 = 6 + 10 + 4 + 1 = 21
  assert.equal(metrics.byKey.risk.value, 21);

  // The freedom of the current configuration is the only input the twelve fields do not carry.
  const withFreedom = projectPlayerMetrics({ systemState, currentActionRisk: 100 });
  assert.equal(withFreedom.byKey.risk.value, 36);
  assert.equal(withFreedom.byKey.speed.value, metrics.byKey.speed.value);
});

test("a boundary takes back the risk the tool it names introduced", () => {
  const catalogue = requireProduct(loadGameContent().chapterById["chapter-01"]);
  const unguarded = currentActionRisk(catalogue, { ...baseConfiguration, toolIds: ["read-docs", "send-message"] });
  const guarded = currentActionRisk(catalogue, {
    ...baseConfiguration,
    toolIds: ["read-docs", "send-message"],
    boundaryIds: ["cite-sources", "confirm-before-send"],
  });

  assert.ok(unguarded > guarded, `expected a guard to lower risk, got ${unguarded} then ${guarded}`);
  // Overflowing the budget is itself unreviewed material the product acts on.
  assert.ok(currentActionRisk(catalogue, { ...baseConfiguration, contextOverflow: 3 }) > currentActionRisk(catalogue, baseConfiguration));
});

test("a build scene asks its questions in order and only moves on after the last one", () => {
  const content = loadGameContent();
  const chapter = content.chapterById["chapter-01"];
  const capability = chapter.sceneById["03_build"].capability;
  assert.ok(capability);

  let state = build(content, [["scattered-information"], ["one-answer"]]);
  assert.equal(state.currentSceneId, "03_build");
  assert.equal(currentBuildStep(capability, state.product.configuration).step?.target, "modelRole");

  state = confirmCapability({ content, state, optionIds: ["retrieve"], occurredAt: at });
  assert.equal(state.currentSceneId, "03_build", "answering one question must not leave the scene");
  assert.equal(currentBuildStep(capability, state.product.configuration).step?.target, "context");

  state = confirmCapability({ content, state, optionIds: ["user-request"], occurredAt: at });
  state = confirmCapability({ content, state, optionIds: ["read-docs"], occurredAt: at });
  assert.equal(state.currentSceneId, "03_build");

  state = confirmCapability({ content, state, optionIds: ["cite-sources"], occurredAt: at });
  assert.equal(state.currentSceneId, "04_test", "the last question ends the scene");
  assert.equal(state.product.configuration.version, 1);
});

test("a step refuses a selection smaller than it asks for", () => {
  const content = loadGameContent();
  const state = build(content, [["scattered-information"], ["one-answer"], ["retrieve"]]);

  assert.throws(() => confirmCapability({ content, state, optionIds: [], occurredAt: at }), /at least 1/);
});

test("the rebuild hands out exactly two changes", () => {
  const content = loadGameContent();
  let state = build(content, [
    ["scattered-information"],
    ["one-answer"],
    ["retrieve"],
    ["user-request", "internal-docs"],
    ["read-docs"],
    ["cite-sources"],
  ]);
  state = advanceToScene({ content, state, sceneId: "05_rebuild", occurredAt: at });

  state = changeComponent({ content, state, component: "tools", optionIds: ["read-docs", "search"], occurredAt: at });
  assert.equal(state.product.rebuild.changes.length, 1);
  assert.deepEqual(state.product.rebuild.changes[0], {
    component: "tools",
    fromLabel: "чтение внутренних документов",
    toLabel: "чтение внутренних документов, поиск",
  });

  state = changeComponent({ content, state, component: "boundaries", optionIds: ["no-personal-data"], occurredAt: at });
  assert.equal(state.product.rebuild.changes.length, 2);

  assert.throws(
    () => changeComponent({ content, state, component: "context", optionIds: ["everything"], occurredAt: at }),
    /allows 2 changes/,
  );
});

test("changing a component re-prices the product without replaying the build", () => {
  const content = loadGameContent();
  let state = build(content, [
    ["scattered-information"],
    ["one-answer"],
    ["retrieve"],
    ["user-request", "internal-docs"],
    ["read-docs"],
    ["no-boundaries"],
  ]);
  state = advanceToScene({ content, state, sceneId: "05_rebuild", occurredAt: at });

  const before = state.playerMetrics.byKey;
  const after = changeComponent({
    content,
    state,
    component: "boundaries",
    optionIds: ["cite-sources", "confirm-before-send"],
    occurredAt: at,
  }).playerMetrics.byKey;

  // Swapping "ничего не ограничивать" for real boundaries buys trust and costs nothing replayed.
  assert.ok(after.trust.value > before.trust.value, `trust ${before.trust.value} → ${after.trust.value}`);
  assert.ok(after.risk.value < before.risk.value, `risk ${before.risk.value} → ${after.risk.value}`);
});
