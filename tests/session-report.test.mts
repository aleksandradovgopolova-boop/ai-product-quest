import assert from "node:assert/strict";
import test from "node:test";
import { advanceToScene, createInitialCampaignState, runChoice } from "../src/application/chapter-runner/chapterRunner";
import { projectSessionReport } from "../src/engines/analytics/projectSessionReport";
import { loadGameContent } from "../src/infrastructure/content/contentLoader";

const start = "2026-07-29T09:00:00.000Z";
const investigationAt = "2026-07-29T09:03:00.000Z";
const endAt = "2026-07-29T09:11:00.000Z";

test("session report reads a completed playthrough out of the Event Log", () => {
  const content = loadGameContent();
  let state = createInitialCampaignState(content, "chapter-01", start);

  for (const sceneId of ["incident-brief", "zero-online", "zero-first-move"]) {
    state = advanceToScene({ content, state, sceneId, occurredAt: start });
  }

  state = runChoice({ content, state, choiceIdOrIndex: "start-owner", occurredAt: start });

  state = advanceToScene({ content, state, sceneId: "chapter-title", occurredAt: start });
  state = advanceToScene({ content, state, sceneId: "origin", occurredAt: investigationAt });

  // One wrong answer, then a retry through the correct branch.
  for (const choiceId of ["internal-docs", "inspect-input", "try", "risk-zone", "show-input", "reveal-context", "read-as-system", "still-answered"]) {
    state = runChoice({ content, state, choiceIdOrIndex: choiceId, occurredAt: investigationAt });
  }

  for (const choiceId of ["memory", "retry-cause", "continuation", "product-error", "decide", "quarantine", "continue", "save-discovery", "belief-team"]) {
    state = runChoice({ content, state, choiceIdOrIndex: choiceId, occurredAt: endAt });
  }

  state = advanceToScene({ content, state, sceneId: "codex-prompt", occurredAt: endAt });
  state = runChoice({ content, state, choiceIdOrIndex: "save-codex", occurredAt: endAt });

  state = advanceToScene({ content, state, sceneId: "final", occurredAt: endAt });

  const report = projectSessionReport(content, state);

  assert.equal(report.chapterId, "chapter-01");
  assert.equal(report.chapterCompleted, true);
  assert.equal(report.opening.reachedInvestigation, true);
  assert.equal(report.opening.abandonedBeforeInvestigation, false);
  assert.deepEqual(report.opening.answers, { approach: "с подписи человека", belief: "хорошая команда" });
  assert.equal(report.opening.elapsedMs, 180_000);
  assert.equal(report.elapsedMs, 660_000);

  // Both wrong answers are the ones the chapter itself answers with an error scene.
  assert.deepEqual(report.wrongAnswers.map((item) => item.choiceId), ["internal-docs", "memory"]);
  assert.equal(report.retries > 0, true);
  assert.equal(report.decision.first?.decisionId, "quarantine-report");
  assert.equal(report.decision.final?.decisionId, "quarantine-report");
  assert.equal(report.decision.attemptCount, 1);
  assert.equal(report.decision.correctedAfterFeedback, false);
  assert.equal(report.decision.final?.effects.trust, 16);
  assert.deepEqual(report.codexUnlocked, ["language-model"]);
  assert.equal(report.artifactsGenerated.length, 1);
  assert.equal(report.resets, 0);
  assert.deepEqual(report.notInstrumented, ["codex.opened", "artifact.opened"]);
});

test("session report marks a run abandoned before the investigation starts", () => {
  const content = loadGameContent();
  let state = createInitialCampaignState(content, "chapter-01", start);
  state = advanceToScene({ content, state, sceneId: "incident-brief", occurredAt: start });

  const report = projectSessionReport(content, state);

  assert.equal(report.opening.reachedInvestigation, false);
  assert.equal(report.opening.abandonedBeforeInvestigation, true);
  assert.equal(report.opening.elapsedMs, undefined);
  assert.equal(report.chapterCompleted, false);
  assert.deepEqual(report.decision.attempts, []);
  assert.equal(report.decision.first, undefined);
  assert.equal(report.decision.correctedAfterFeedback, false);
});

test("session report separates a decision reached unaided from one corrected after feedback", () => {
  const content = loadGameContent();
  let state = createInitialCampaignState(content, "chapter-01", start);
  state = advanceToScene({ content, state, sceneId: "decision", occurredAt: start });

  // The chapter sends a wrong decision back to the same scene, so a player can reach the
  // safe answer by elimination. The report must not read that as an unaided choice.
  state = runChoice({ content, state, choiceIdOrIndex: "draft", occurredAt: start });
  state = runChoice({ content, state, choiceIdOrIndex: "retry-decision", occurredAt: start });
  state = runChoice({ content, state, choiceIdOrIndex: "regenerate", occurredAt: start });
  state = runChoice({ content, state, choiceIdOrIndex: "retry-decision", occurredAt: start });
  state = runChoice({ content, state, choiceIdOrIndex: "quarantine", occurredAt: endAt });

  const report = projectSessionReport(content, state);

  assert.equal(report.decision.attemptCount, 3);
  assert.deepEqual(report.decision.attempts.map((attempt) => attempt.decisionId), [
    "send-draft",
    "regenerate-stricter",
    "quarantine-report",
  ]);
  assert.equal(report.decision.first?.decisionId, "send-draft");
  assert.equal(report.decision.final?.decisionId, "quarantine-report");
  assert.equal(report.decision.correctedAfterFeedback, true);
});
