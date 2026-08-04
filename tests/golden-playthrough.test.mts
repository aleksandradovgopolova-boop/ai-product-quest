import assert from "node:assert/strict";
import test from "node:test";
import { advanceToScene, createInitialCampaignState, interpolateLines, runChoice } from "../src/application/chapter-runner/chapterRunner";
import { loadGameContent } from "../src/infrastructure/content/contentLoader";

const at = "2026-07-29T09:00:00.000Z";

test("Golden Playthrough validates Event Log, Dashboard and stage projection", () => {
  const content = loadGameContent();
  let state = createInitialCampaignState(content, "chapter-01", at);

  assert.equal(state.currentSceneId, "boot");
  assert.equal(state.dashboard.chapterTitle, "Глава I: Создать");
  assert.equal(state.dashboard.currentStageLabel, "Войти");
  assert.equal(state.dashboard.totalStages, 5);

  for (const sceneId of ["zero-intro", "belief-question"]) {
    state = advanceToScene({ content, state, sceneId, occurredAt: at });
  }
  state = runChoice({ content, state, choiceIdOrIndex: "belief-problem", occurredAt: at });

  assert.equal(state.currentSceneId, "belief-ack");
  assert.equal(state.variables.belief, "проблема человека");
  assert.equal(state.dashboard.currentStageIndex, 2);
  assert.equal(state.campaignId, "ai-product-quest:campaign:v1");

  // The answer must come back in Zero's own line, not only as an event.
  const chapter = content.chapterById["chapter-01"];
  assert.deepEqual(interpolateLines(chapter.sceneById["belief-ack"].lines, state.variables), [
    "«проблема человека».",
    "Запомнил.",
    "Посмотрим, останешься ли ты при этом мнении.",
  ]);

  assert.equal(
    state.eventLog.some((event) => event.type === "choice.submitted" && event.payload.choiceId === "belief-problem"),
    true,
  );

  // The chapter that builds a product has not been written yet: nothing may claim otherwise.
  assert.deepEqual(state.artifacts, []);
  assert.deepEqual(state.unlockedCodexEntryIds, []);
});
