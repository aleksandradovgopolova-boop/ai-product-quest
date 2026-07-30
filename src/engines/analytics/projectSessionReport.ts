import { getChapter, getScene } from "@/src/domain/campaign/lookup";
import type { CampaignState, GameEvent, PlatformContent } from "@/src/domain/campaign/types";

/**
 * Product-side reading of a playthrough, derived entirely from the Event Log.
 *
 * This is a projection, not new instrumentation: it answers the questions an observed
 * playthrough needs to answer, using events the game already records. Two signals are
 * deliberately absent because nothing emits them yet — see `notInstrumented`.
 */
export type SessionReport = {
  campaignId: string;
  chapterId: string;
  startedAt?: string;
  lastEventAt?: string;
  elapsedMs?: number;
  prologue: {
    completed: boolean;
    reachedIncident: boolean;
    abandonedBeforeIncident: boolean;
    answers: Record<string, string>;
    elapsedMs?: number;
  };
  scenesEntered: number;
  uniqueScenesEntered: number;
  retries: number;
  choices: Array<{ sceneId: string; choiceId: string; label: string; occurredAt: string }>;
  wrongAnswers: Array<{ sceneId: string; choiceId: string; label: string }>;
  decision?: { decisionId: string; label: string; effects: Record<string, number> };
  codexUnlocked: string[];
  artifactsGenerated: string[];
  chapterCompleted: boolean;
  resets: number;
  notInstrumented: string[];
};

const incidentSceneId = "incident";
const finalSceneId = "final";

export function projectSessionReport(content: PlatformContent, state: CampaignState): SessionReport {
  const chapter = getChapter(content, state.currentChapterId);
  const events = state.eventLog;
  const sceneEntries = events.filter((event) => event.type === "scene.entered");
  const seenScenes = new Set<string>();
  let retries = 0;

  for (const event of sceneEntries) {
    const sceneId = readString(event.payload.sceneId);

    if (sceneId && seenScenes.has(sceneId)) {
      retries += 1;
    }

    if (sceneId) {
      seenScenes.add(sceneId);
    }
  }

  const choiceEvents = events.filter((event) => event.type === "choice.submitted");
  const choices = choiceEvents.map((event) => ({
    sceneId: readString(event.payload.sceneId),
    choiceId: readString(event.payload.choiceId),
    label: readString(event.payload.label),
    occurredAt: event.occurredAt,
  }));

  // A wrong answer is one the chapter itself answers with an error-toned scene.
  const wrongAnswers = choiceEvents
    .filter((event) => {
      const nextSceneId = readString(event.payload.nextSceneId);
      return Boolean(nextSceneId) && chapter.sceneById[nextSceneId]?.tone === "error";
    })
    .map((event) => ({
      sceneId: readString(event.payload.sceneId),
      choiceId: readString(event.payload.choiceId),
      label: readString(event.payload.label),
    }));

  const answers: Record<string, string> = {};

  for (const event of choiceEvents) {
    const variables = event.payload.variables;

    if (variables && typeof variables === "object" && !Array.isArray(variables)) {
      for (const [name, value] of Object.entries(variables)) {
        if (typeof value === "string") {
          answers[name] = value;
        }
      }
    }
  }

  const startedAt = events[0]?.occurredAt;
  const lastEventAt = events.at(-1)?.occurredAt;
  const incidentAt = firstSceneEntryAt(sceneEntries, incidentSceneId);
  const lastDecision = Object.values(state.decisions).at(-1);

  return {
    campaignId: state.campaignId,
    chapterId: chapter.id,
    startedAt,
    lastEventAt,
    elapsedMs: durationMs(startedAt, lastEventAt),
    prologue: {
      completed: Boolean(incidentAt),
      reachedIncident: Boolean(incidentAt),
      abandonedBeforeIncident: !incidentAt,
      answers,
      elapsedMs: durationMs(startedAt, incidentAt),
    },
    scenesEntered: sceneEntries.length,
    uniqueScenesEntered: seenScenes.size,
    retries,
    choices,
    wrongAnswers,
    decision: lastDecision
      ? { decisionId: lastDecision.id, label: lastDecision.label, effects: { ...lastDecision.effects } }
      : undefined,
    codexUnlocked: [...state.unlockedCodexEntryIds],
    artifactsGenerated: state.artifacts.map((artifact) => artifact.id),
    chapterCompleted: seenScenes.has(finalSceneId) && Boolean(getScene(chapter, finalSceneId)),
    resets: events.filter((event) => event.type === "campaign.reset_completed" || event.type === "campaign.reset").length,
    // Opening the Codex overlay and opening an artifact are UI-only today, so a session
    // report cannot show them. Instrument them as domain events before relying on them.
    notInstrumented: ["codex.opened", "artifact.opened"],
  };
}

function firstSceneEntryAt(sceneEntries: GameEvent[], sceneId: string) {
  return sceneEntries.find((event) => readString(event.payload.sceneId) === sceneId)?.occurredAt;
}

function durationMs(from?: string, to?: string) {
  if (!from || !to) {
    return undefined;
  }

  const elapsed = Date.parse(to) - Date.parse(from);
  return Number.isFinite(elapsed) ? elapsed : undefined;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}
