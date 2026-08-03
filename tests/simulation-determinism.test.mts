import assert from "node:assert/strict";
import test from "node:test";
import { advanceToScene, createInitialCampaignState, runChoice } from "../src/application/chapter-runner/chapterRunner";
import { loadGameContent } from "../src/infrastructure/content/contentLoader";

const at = "2026-07-29T11:00:00.000Z";

test("simulation and event ids are deterministic for the same playthrough", () => {
  const content = loadGameContent();

  function play() {
    let state = createInitialCampaignState(content, "chapter-01", at);

    for (const sceneId of ["incident-brief", "zero-online", "zero-first-move"]) {
      state = advanceToScene({ content, state, sceneId, occurredAt: at });
    }

    for (const choiceId of [
      "start-report",
    ]) {
      state = runChoice({ content, state, choiceIdOrIndex: choiceId, occurredAt: at });
    }

    for (const sceneId of ["chapter-title", "origin"]) {
      state = advanceToScene({ content, state, sceneId, occurredAt: at });
    }

    for (const choiceId of [
      "continuation",
      "inspect-principle",
      "try",
      "active-phase",
      "show-input",
      "reveal-context",
      "read-as-system",
      "still-answered",
      "continuation",
      "product-error",
      "decide",
      "regenerate",
    ]) {
      state = runChoice({ content, state, choiceIdOrIndex: choiceId, occurredAt: at });
    }

    return state;
  }

  const first = play();
  const second = play();

  assert.deepEqual(first.eventLog, second.eventLog);
  assert.deepEqual(first.systemState, second.systemState);
  assert.equal(first.systemState.trust, 23);
  assert.equal(first.systemState.technicalDebt, 24);
  assert.equal(first.currentSceneId, "decision-wrong");
});
