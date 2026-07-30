import assert from "node:assert/strict";
import test from "node:test";
import { loadGameContent } from "../src/infrastructure/content/contentLoader";
import {
  campaignStorageKey,
  legacyFlowStorageKey,
  legacyMissionStorageKey,
  legacyProgressStorageKey,
  loadCampaignState,
} from "../src/infrastructure/save/saveAdapter";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

test("migrates ai-product-quest-flow-v1 into the canonical campaign save", () => {
  const content = loadGameContent();
  const storage = new MemoryStorage();
  storage.setItem(
    legacyFlowStorageKey,
    JSON.stringify({
      stepId: "decision",
      codexUnlocked: true,
      codexEntryIds: ["language-model"],
      prediction: "зоне риска",
    }),
  );

  const state = loadCampaignState(content, storage, "2026-07-29T10:00:00.000Z");

  assert.equal(state.currentSceneId, "decision");
  assert.equal(state.variables.prediction, "зоне риска");
  assert.deepEqual(state.unlockedCodexEntryIds, ["language-model"]);
  assert.ok(storage.getItem(campaignStorageKey));
  assert.equal(storage.getItem(legacyFlowStorageKey), null);
  assert.equal(state.eventLog.some((event) => event.type === "legacy.save_migrated"), true);
});

test("projects a saved Event Log written before choice.submitted carried variables", () => {
  const content = loadGameContent();
  const storage = new MemoryStorage();
  const campaignId = "ai-product-quest:campaign:v1";
  storage.setItem(
    campaignStorageKey,
    JSON.stringify({
      schemaVersion: 1,
      campaignId,
      eventLog: [
        { id: `${campaignId}:event:0001`, sequence: 1, type: "campaign.started", occurredAt: "2026-07-29T10:00:00.000Z", payload: { campaignId } },
        {
          id: `${campaignId}:event:0002`,
          sequence: 2,
          type: "chapter.started",
          occurredAt: "2026-07-29T10:00:00.000Z",
          payload: { chapterId: "chapter-01", sceneId: "zero-boot" },
        },
        {
          id: `${campaignId}:event:0003`,
          sequence: 3,
          type: "choice.submitted",
          occurredAt: "2026-07-29T10:00:00.000Z",
          payload: {
            chapterId: "chapter-01",
            sceneId: "experiment",
            choiceId: "risk-zone",
            label: "зоне риска",
            nextSceneId: "experiment-feedback",
            prediction: "зоне риска",
            effects: {},
          },
        },
      ],
    }),
  );

  const state = loadCampaignState(content, storage, "2026-07-29T10:10:00.000Z");

  assert.equal(state.currentSceneId, "experiment-feedback");
  assert.equal(state.variables.prediction, "зоне риска");
  assert.equal(state.variables.belief, undefined);
  assert.equal(state.variables.approach, undefined);
});

test("migrates mission-v2 and progress saves, then removes all legacy keys", () => {
  const content = loadGameContent();
  const storage = new MemoryStorage();
  storage.setItem(legacyMissionStorageKey, JSON.stringify({ phase: "context-reveal" }));
  storage.setItem(
    legacyProgressStorageKey,
    JSON.stringify({
      state: {
        progress: {
          lastArtifactId: "language-model-001",
        },
      },
    }),
  );

  const state = loadCampaignState(content, storage, "2026-07-29T10:05:00.000Z");

  assert.equal(state.currentSceneId, "context-reveal");
  assert.ok(storage.getItem(campaignStorageKey));
  assert.equal(storage.getItem(legacyMissionStorageKey), null);
  assert.equal(storage.getItem(legacyProgressStorageKey), null);
});
