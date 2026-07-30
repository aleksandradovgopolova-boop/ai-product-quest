import { createEvent, createInitialCampaignState } from "@/src/application/chapter-runner/chapterRunner";
import { projectCampaign } from "@/src/engines/projection/projectCampaign";
import { campaignStateSchemaVersion, type CampaignState, type GameEvent, type PlatformContent, type StoredCampaignState } from "@/src/domain/campaign/types";

export const campaignStorageKey = "ai-product-quest-campaign-v1";
export const legacyFlowStorageKey = "ai-product-quest-flow-v1";
export const legacyMissionStorageKey = "ai-product-quest-mission-v2";
export const legacyProgressStorageKey = "ai-product-quest-progress";

const legacyStorageKeys = [legacyFlowStorageKey, legacyMissionStorageKey, legacyProgressStorageKey];

export type StorageAdapter = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function loadCampaignState(content: PlatformContent, storage: StorageAdapter, occurredAt = new Date().toISOString()): CampaignState {
  const current = storage.getItem(campaignStorageKey);

  if (current) {
    const parsed = parseStoredState(current);
    if (parsed) {
      return projectCampaign(content, parsed.eventLog);
    }

    storage.removeItem(campaignStorageKey);
  }

  const migrated = migrateLegacySaves(content, storage, occurredAt);

  if (migrated) {
    saveCampaignState(storage, migrated);
    removeLegacySaves(storage);
    return migrated;
  }

  const initialState = createInitialCampaignState(content, undefined, occurredAt);
  saveCampaignState(storage, initialState);

  return initialState;
}

export function saveCampaignState(storage: StorageAdapter, state: CampaignState) {
  const stored: StoredCampaignState = {
    schemaVersion: campaignStateSchemaVersion,
    campaignId: state.campaignId,
    eventLog: state.eventLog,
  };

  storage.setItem(campaignStorageKey, JSON.stringify(stored));
}

export function clearCampaignState(storage: StorageAdapter) {
  storage.removeItem(campaignStorageKey);
  removeLegacySaves(storage);
}

export function migrateLegacySaves(content: PlatformContent, storage: StorageAdapter, occurredAt = new Date().toISOString()): CampaignState | undefined {
  for (const key of legacyStorageKeys) {
    const raw = storage.getItem(key);

    if (!raw) {
      continue;
    }

    const migrated = migrateLegacyPayload(content, key, raw, occurredAt);

    if (migrated) {
      return migrated;
    }
  }

  return undefined;
}

export function removeLegacySaves(storage: StorageAdapter) {
  for (const key of legacyStorageKeys) {
    storage.removeItem(key);
  }
}

function migrateLegacyPayload(content: PlatformContent, legacyKey: string, raw: string, occurredAt: string) {
  const parsed = safeJson(raw);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return undefined;
  }

  const chapter = content.chapters[0];
  if (!chapter) {
    return undefined;
  }

  const legacy = parsed as Record<string, unknown>;
  const nestedState = isRecord(legacy.state) ? legacy.state : undefined;
  const legacyProgress = isRecord(nestedState?.progress) ? nestedState?.progress : undefined;
  const legacyEpisode = isRecord(legacyProgress?.episodes) ? Object.values(legacyProgress.episodes).find(isRecord) : undefined;
  const sceneId = pickExistingScene(chapter.sceneById, [
    readString(legacy.stepId),
    readString(legacy.sceneId),
    readString(legacy.phase),
    readString(legacyEpisode?.currentSceneId),
    typeof legacyEpisode?.currentScreenIndex === "number" && legacyEpisode.currentScreenIndex > 0 ? "principle" : undefined,
  ]);
  const codexEntryIds = collectLegacyCodexEntryIds(legacy, legacyProgress);
  const prediction = readString(legacy.prediction);
  const initial = createInitialCampaignState(content, chapter.id, occurredAt);
  const eventLog: GameEvent[] = [
    ...initial.eventLog,
    createEvent(initial.campaignId, initial.eventLog.length + 1, "legacy.save_migrated", occurredAt, {
      fromKey: legacyKey,
      chapterId: chapter.id,
      sceneId,
      prediction,
      codexEntryIds,
      legacyMarked: true,
    }),
    createEvent(initial.campaignId, initial.eventLog.length + 2, "scene.entered", occurredAt, {
      chapterId: chapter.id,
      sceneId,
    }),
  ];

  for (const entryId of codexEntryIds) {
    eventLog.push(
      createEvent(initial.campaignId, eventLog.length + 1, "codex.entry_unlocked", occurredAt, {
        entryId,
        chapterId: chapter.id,
      }),
    );
  }

  return projectCampaign(content, eventLog);
}

function parseStoredState(raw: string): StoredCampaignState | undefined {
  const parsed = safeJson(raw);

  if (!isRecord(parsed)) {
    return undefined;
  }

  if (parsed.schemaVersion !== campaignStateSchemaVersion || typeof parsed.campaignId !== "string" || !Array.isArray(parsed.eventLog)) {
    return undefined;
  }

  return parsed as StoredCampaignState;
}

function collectLegacyCodexEntryIds(legacy: Record<string, unknown>, legacyProgress?: Record<string, unknown>) {
  const ids = new Set<string>();
  const directIds = Array.isArray(legacy.codexEntryIds) ? legacy.codexEntryIds : [];

  for (const id of directIds) {
    if (typeof id === "string") {
      ids.add(id);
    }
  }

  if (legacy.codexUnlocked === true || legacyProgress?.lastArtifactId === "language-model-001") {
    ids.add("language-model");
  }

  return Array.from(ids);
}

function pickExistingScene(sceneById: Record<string, unknown>, candidates: Array<string | undefined>) {
  for (const candidate of candidates) {
    if (candidate && sceneById[candidate]) {
      return candidate;
    }
  }

  return "incident";
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}
