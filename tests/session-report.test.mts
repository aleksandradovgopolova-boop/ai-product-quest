import assert from "node:assert/strict";
import test from "node:test";
import { advanceToScene, createInitialCampaignState, runChoice } from "../src/application/chapter-runner/chapterRunner";
import { projectSessionReport } from "../src/engines/analytics/projectSessionReport";
import { loadGameContent } from "../src/infrastructure/content/contentLoader";

const start = "2026-07-29T09:00:00.000Z";
const incidentAt = "2026-07-29T09:03:00.000Z";
const endAt = "2026-07-29T09:11:00.000Z";

test("session report reads a completed playthrough out of the Event Log", () => {
  const content = loadGameContent();
  let state = createInitialCampaignState(content, "chapter-01", start);

  for (const sceneId of ["zero-first-contact", "zero-product-question"]) {
    state = advanceToScene({ content, state, sceneId, occurredAt: start });
  }

  state = runChoice({ content, state, choiceIdOrIndex: "product-team", occurredAt: start });

  for (const sceneId of ["zero-signal", "zero-method"]) {
    state = advanceToScene({ content, state, sceneId, occurredAt: start });
  }

  for (const choiceId of ["continue-zero-method", "start-people"]) {
    state = runChoice({ content, state, choiceIdOrIndex: choiceId, occurredAt: start });
  }

  for (const sceneId of ["chapter-title", "mission-handoff", "case-open"]) {
    state = advanceToScene({ content, state, sceneId, occurredAt: start });
  }

  state = advanceToScene({ content, state, sceneId: "incident", occurredAt: incidentAt });

  // One wrong answer, then a retry through the correct branch.
  for (const choiceId of ["continue", "internal-docs", "inspect-input", "try", "risk-zone", "show-input", "reveal-context", "read-as-system", "still-answered"]) {
    state = runChoice({ content, state, choiceIdOrIndex: choiceId, occurredAt: incidentAt });
  }

  for (const choiceId of ["memory", "retry-cause", "continuation", "product-error", "decide", "quarantine", "continue", "save-discovery", "save-codex"]) {
    state = runChoice({ content, state, choiceIdOrIndex: choiceId, occurredAt: endAt });
  }

  state = advanceToScene({ content, state, sceneId: "final", occurredAt: endAt });

  const report = projectSessionReport(content, state);

  assert.equal(report.chapterId, "chapter-01");
  assert.equal(report.chapterCompleted, true);
  assert.equal(report.prologue.reachedIncident, true);
  assert.equal(report.prologue.abandonedBeforeIncident, false);
  assert.deepEqual(report.prologue.answers, { belief: "хорошая команда", approach: "искать людей" });
  assert.equal(report.prologue.elapsedMs, 180_000);
  assert.equal(report.elapsedMs, 660_000);

  // Both wrong answers are the ones the chapter itself answers with an error scene.
  assert.deepEqual(report.wrongAnswers.map((item) => item.choiceId), ["internal-docs", "memory"]);
  assert.equal(report.retries > 0, true);
  assert.equal(report.decision?.decisionId, "quarantine-report");
  assert.equal(report.decision?.effects.trust, 16);
  assert.deepEqual(report.codexUnlocked, ["language-model"]);
  assert.equal(report.artifactsGenerated.length, 1);
  assert.equal(report.resets, 0);
  assert.deepEqual(report.notInstrumented, ["codex.opened", "artifact.opened"]);
});

test("session report marks a run abandoned inside the prologue", () => {
  const content = loadGameContent();
  let state = createInitialCampaignState(content, "chapter-01", start);
  state = advanceToScene({ content, state, sceneId: "zero-first-contact", occurredAt: start });

  const report = projectSessionReport(content, state);

  assert.equal(report.prologue.reachedIncident, false);
  assert.equal(report.prologue.abandonedBeforeIncident, true);
  assert.equal(report.prologue.elapsedMs, undefined);
  assert.equal(report.chapterCompleted, false);
  assert.equal(report.decision, undefined);
});
