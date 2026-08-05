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
      // A save can be structurally valid and still name scenes this chapter no longer has. That
      // is not a corrupt save, it is a replaced chapter, so it migrates rather than throws.
      const projected = tryProject(content, parsed.eventLog);

      if (projected) {
        return projected;
      }
    }

    const rebuilt = migrateReplacedChapter(content, current, occurredAt);

    if (rebuilt) {
      saveCampaignState(storage, rebuilt);
      return rebuilt;
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
  const sceneId = pickExistingScene(chapter.sceneById, chapter.initialSceneId, [
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

/** Codex entries the player already earned survive a chapter being replaced. */
const codexEntryMigration: Record<string, string> = {
  "language-model": "llm-not-product",
};

/**
 * A save written before Chapter 01 was replaced points at scenes that no longer exist, so its
 * log cannot be projected. Rather than dropping the player silently, the run restarts from the
 * new opening and everything that belongs to the player — unlocked Codex entries — is carried
 * over, with the migration itself recorded in the log.
 */
function migrateReplacedChapter(content: PlatformContent, raw: string, occurredAt: string): CampaignState | undefined {
  const parsed = safeJson(raw);

  if (!isRecord(parsed) || !Array.isArray(parsed.eventLog)) {
    return undefined;
  }

  const carriedEntryIds = new Set<string>();

  for (const event of parsed.eventLog) {
    if (!isRecord(event) || event.type !== "codex.entry_unlocked" || !isRecord(event.payload)) {
      continue;
    }

    const entryId = typeof event.payload.entryId === "string" ? event.payload.entryId : undefined;
    const migratedId = entryId ? (codexEntryMigration[entryId] ?? entryId) : undefined;

    if (migratedId && content.codexEntryById[migratedId]) {
      carriedEntryIds.add(migratedId);
    }
  }

  const chapter = content.chapters[0];

  if (!chapter) {
    return undefined;
  }

  const fresh = createInitialCampaignState(content, chapter.id, occurredAt);
  const events: GameEvent[] = [...fresh.eventLog];

  events.push(
    createEvent(fresh.campaignId, events.length + 1, "legacy.save_migrated", occurredAt, {
      fromKey: campaignStorageKey,
      chapterId: chapter.id,
      sceneId: chapter.initialSceneId,
      codexEntryIds: [...carriedEntryIds],
      legacyMarked: true,
    }),
  );

  for (const entryId of carriedEntryIds) {
    events.push(
      createEvent(fresh.campaignId, events.length + 1, "codex.entry_unlocked", occurredAt, {
        entryId,
        chapterId: chapter.id,
      }),
    );
  }

  return projectCampaign(content, events);
}

function tryProject(content: PlatformContent, eventLog: GameEvent[]): CampaignState | undefined {
  try {
    return projectCampaign(content, eventLog);
  } catch {
    return undefined;
  }
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
      ids.add(codexEntryMigration[id] ?? id);
    }
  }

  if (legacy.codexUnlocked === true || legacyProgress?.lastArtifactId === "language-model-001") {
    ids.add(codexEntryMigration["language-model"]);
  }

  return Array.from(ids);
}

function pickExistingScene(sceneById: Record<string, unknown>, fallbackSceneId: string, candidates: Array<string | undefined>) {
  for (const candidate of candidates) {
    if (candidate && sceneById[candidate]) {
      return candidate;
    }
  }

  // A legacy save can only name scenes of the chapter it was written for. When none of them
  // survive, the run starts at the chapter's own opening.
  return fallbackSceneId;
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
