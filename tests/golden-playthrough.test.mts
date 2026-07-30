import assert from "node:assert/strict";
import test from "node:test";
import { advanceToScene, createInitialCampaignState, interpolateLines, runChoice } from "../src/application/chapter-runner/chapterRunner";
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

  for (const sceneId of ["chapter-title", "mission-handoff", "case-open", "incident"]) {
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
  assert.equal(state.variables.belief, "не знаю");
  assert.equal(state.variables.approach, "искать проблему");
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

  // The two prologue answers must reach Zero's own lines, not only the Event Log.
  const chapter = content.chapterById["chapter-01"];
  assert.deepEqual(interpolateLines(chapter.sceneById["zero-product-response"].lines, state.variables)[0], "«не знаю».");
  assert.deepEqual(interpolateLines(chapter.sceneById["zero-hypotheses"].lines, state.variables), [
    "Две гипотезы о тебе.",
    "Продукт — это «не знаю».",
    "Начинать ты будешь так: «искать проблему».",
    "Скорее всего, обе неверны.",
    "Это нормально.",
  ]);

  assert.equal(state.eventLog.some((event) => event.type === "artifact.generated"), true);
});
