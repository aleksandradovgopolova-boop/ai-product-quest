import assert from "node:assert/strict";
import test from "node:test";
import { advanceToScene, createInitialCampaignState, runChoice } from "../src/application/chapter-runner/chapterRunner";
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
  assert.deepEqual(report.decision.attempts, []);
});
