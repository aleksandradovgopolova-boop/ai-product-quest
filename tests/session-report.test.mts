import assert from "node:assert/strict";
import test from "node:test";
import { advanceToScene, createInitialCampaignState, runChoice } from "../src/application/chapter-runner/chapterRunner";
import { changeComponent, confirmCapability, confirmRebuild, runTests } from "../src/application/chapter-runner/productRunner";
import { projectSessionReport } from "../src/engines/analytics/projectSessionReport";
import { loadGameContent } from "../src/infrastructure/content/contentLoader";

const start = "2026-07-29T09:00:00.000Z";
const buildAt = "2026-07-29T09:03:00.000Z";

test("session report reads a run out of the Event Log", () => {
  const content = loadGameContent();
  let state = createInitialCampaignState(content, "chapter-01", start);

  for (const sceneId of ["01_zero_arrives", "01_zero_intro", "01_belief"]) {
    state = advanceToScene({ content, state, sceneId, occurredAt: start });
  }

  state = runChoice({ content, state, choiceIdOrIndex: "belief-technology", occurredAt: buildAt });

  const report = projectSessionReport(content, state);

  assert.equal(report.chapterId, "chapter-01");
  assert.equal(report.opening.reachedBuild, true);
  assert.equal(report.opening.abandonedBeforeBuild, false);
  assert.deepEqual(report.opening.answers, { belief: "новая технология" });
  assert.equal(report.opening.elapsedMs, 180_000);
  assert.equal(report.resets, 0);
});

test("session report marks a run abandoned before the build starts", () => {
  const content = loadGameContent();
  let state = createInitialCampaignState(content, "chapter-01", start);
  state = advanceToScene({ content, state, sceneId: "01_zero_intro", occurredAt: start });

  const report = projectSessionReport(content, state);

  assert.equal(report.opening.reachedBuild, false);
  assert.equal(report.opening.abandonedBeforeBuild, true);
  assert.equal(report.opening.elapsedMs, undefined);
  assert.equal(report.chapterCompleted, false);

  // Nothing about the product is decided yet, and none of it reads as a failure.
  assert.equal(report.product.reachedFirstRun, false);
  assert.equal(report.product.boundedOnFirstBuild, undefined);
  assert.equal(report.product.actsUnaskedAtFinish, undefined);
  assert.equal(report.product.changesLinkedToEvidence, undefined);
});

test("the session report reads whether changes went where the run pointed", () => {
  const content = loadGameContent();
  let state = createInitialCampaignState(content, "chapter-01", start);

  for (const sceneId of ["01_zero_arrives"]) {
    state = advanceToScene({ content, state, sceneId, occurredAt: start });
  }

  state = runChoice({ content, state, choiceIdOrIndex: "i-am-here", occurredAt: start });
  state = advanceToScene({ content, state, sceneId: "01_belief", occurredAt: start });
  state = runChoice({ content, state, choiceIdOrIndex: "belief-problem", occurredAt: start });

  // A product that can send and has nothing stopping it: the run will say so.
  for (const optionIds of [
    ["scattered-information"],
    ["one-answer"],
    ["retrieve"],
    ["user-request", "internal-docs"],
    ["read-docs", "send-message"],
    ["no-boundaries"],
  ]) {
    state = confirmCapability({ content, state, optionIds, occurredAt: start });
  }

  const built = projectSessionReport(content, state);

  assert.equal(built.product.reachedFirstRun, true);
  assert.equal(built.product.boundedOnFirstBuild, false);
  assert.equal(built.product.firstRunBands.includes("unbounded"), true);
  assert.equal(built.product.faultsNamed.includes("boundaries"), true);
  // Nothing has been changed yet, so there is no link to judge.
  assert.equal(built.product.changesLinkedToEvidence, undefined);

  state = runTests({ content, state, occurredAt: start });
  state = changeComponent({ content, state, component: "boundaries", optionIds: ["confirm-before-send"], occurredAt: start });

  const linked = projectSessionReport(content, state);
  assert.deepEqual(linked.product.changedComponents, ["boundaries"]);
  assert.equal(linked.product.changesLinkedToEvidence, true, "the change went where the run pointed");

  const finished = projectSessionReport(content, confirmRebuild({ content, state, occurredAt: start }));
  assert.equal(finished.chapterCompleted, true);
  assert.equal(finished.product.reachedLaunch, true);
  assert.equal(finished.product.actsUnaskedAtFinish, false, "a boundary was put on it before launch");
});

test("a change that ignores the run is not counted as linked", () => {
  const content = loadGameContent();
  let state = createInitialCampaignState(content, "chapter-01", start);

  state = advanceToScene({ content, state, sceneId: "01_zero_arrives", occurredAt: start });
  state = runChoice({ content, state, choiceIdOrIndex: "i-am-here", occurredAt: start });
  state = advanceToScene({ content, state, sceneId: "01_belief", occurredAt: start });
  state = runChoice({ content, state, choiceIdOrIndex: "belief-problem", occurredAt: start });

  for (const optionIds of [
    ["scattered-information"],
    ["one-answer"],
    ["retrieve"],
    ["user-request", "internal-docs"],
    ["read-docs", "send-message"],
    ["no-boundaries"],
  ]) {
    state = confirmCapability({ content, state, optionIds, occurredAt: start });
  }

  state = runTests({ content, state, occurredAt: start });
  // The run named the missing boundary; the player changed the outcome instead.
  state = changeComponent({ content, state, component: "outcome", optionIds: ["morning-digest"], occurredAt: start });

  const report = projectSessionReport(content, state);

  assert.equal(report.product.faultsNamed.includes("outcome"), false);
  assert.equal(report.product.changesLinkedToEvidence, false);

  const finished = projectSessionReport(content, confirmRebuild({ content, state, occurredAt: start }));
  assert.equal(finished.product.actsUnaskedAtFinish, true, "nothing was ever put in the way");
});
