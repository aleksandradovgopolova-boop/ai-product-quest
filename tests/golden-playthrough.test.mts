import assert from "node:assert/strict";
import test from "node:test";
import { advanceToScene, createInitialCampaignState, runChoice } from "../src/application/chapter-runner/chapterRunner";
import { loadGameContent } from "../src/infrastructure/content/contentLoader";

const at = "2026-07-29T09:00:00.000Z";

test("Golden Playthrough validates Event Log, Dashboard, Codex, and artifacts", () => {
  const content = loadGameContent();
  let state = createInitialCampaignState(content, "chapter-01", at);

  for (const sceneId of ["zero-first-contact", "zero-product-question"]) {
    state = advanceToScene({ content, state, sceneId, occurredAt: at });
  }

  for (const choiceId of [
    "product-unknown",
  ]) {
    state = runChoice({ content, state, choiceIdOrIndex: choiceId, occurredAt: at });
  }

  for (const sceneId of ["zero-signal", "zero-method"]) {
    state = advanceToScene({ content, state, sceneId, occurredAt: at });
  }

  for (const choiceId of [
    "continue-zero-method",
    "start-problem",
  ]) {
    state = runChoice({ content, state, choiceIdOrIndex: choiceId, occurredAt: at });
  }

  for (const sceneId of ["chapter-title", "mission-handoff", "incident"]) {
    state = advanceToScene({ content, state, sceneId, occurredAt: at });
  }

  for (const choiceId of [
    "continue",
    "continuation",
    "inspect-principle",
    "try",
    "risk-zone",
    "show-input",
    "reveal-context",
    "read-as-system",
    "still-answered",
    "continuation",
    "product-error",
    "decide",
    "quarantine",
    "continue",
    "save-discovery",
    "save-codex",
  ]) {
    state = runChoice({ content, state, choiceIdOrIndex: choiceId, occurredAt: at });
  }

  state = advanceToScene({ content, state, sceneId: "final", occurredAt: at });

  assert.equal(state.currentSceneId, "final");
  assert.equal(state.campaignId, "ai-product-quest:campaign:v1");
  assert.equal(state.variables.prediction, "зоне риска");
  assert.equal(state.decisions["quarantine-report"].label, "Остановить отчёт и пометить как непроверенный");
  assert.equal(state.systemState.quality, 50);
  assert.equal(state.systemState.trust, 47);
  assert.equal(state.systemState.observability, 42);
  assert.deepEqual(state.unlockedCodexEntryIds, ["language-model"]);
  assert.equal(state.artifacts.length, 1);
  assert.match(state.artifacts[0]?.body ?? "", /Трассировка источников/);
  assert.equal(state.dashboard.caseTitle, "Дело №01: Непроверенный отчёт");
  assert.equal(state.dashboard.currentStepIndex, 6);
  assert.equal(state.dashboard.artifactCount, 1);
  assert.equal(state.engineerProfile.skills[0], "Отделять модель от продукта");
  assert.equal(state.eventLog.some((event) => event.type === "choice.submitted" && event.payload.choiceId === "product-unknown"), true);
  assert.equal(state.eventLog.some((event) => event.type === "choice.submitted" && event.payload.choiceId === "start-problem"), true);
  assert.equal(state.eventLog.some((event) => event.type === "decision.submitted"), true);
  assert.equal(state.eventLog.some((event) => event.type === "artifact.generated"), true);
});
