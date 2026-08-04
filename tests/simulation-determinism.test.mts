import assert from "node:assert/strict";
import test from "node:test";
import { advanceToScene, createInitialCampaignState, runChoice } from "../src/application/chapter-runner/chapterRunner";
import { loadGameContent } from "../src/infrastructure/content/contentLoader";

const at = "2026-07-29T11:00:00.000Z";

test("simulation and event ids are deterministic for the same playthrough", () => {
  const content = loadGameContent();

  function play() {
    let state = createInitialCampaignState(content, "chapter-01", at);

    for (const sceneId of ["zero-intro", "belief-question"]) {
      state = advanceToScene({ content, state, sceneId, occurredAt: at });
    }
    state = runChoice({ content, state, choiceIdOrIndex: "belief-idea", occurredAt: at });

    return state;
  }

  const first = play();
  const second = play();

  assert.deepEqual(first.eventLog, second.eventLog);
  assert.deepEqual(first.systemState, second.systemState);
  // No decision has been priced yet in this chapter, so the system stays where it started.
  assert.equal(first.systemState.trust, content.chapterById["chapter-01"].initialSystemState.trust);
  assert.equal(first.currentSceneId, "belief-ack");
  assert.deepEqual(
    first.eventLog.map((event) => event.id),
    second.eventLog.map((event) => event.id),
  );
});
