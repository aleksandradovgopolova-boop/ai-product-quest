import { getChapter } from "@/src/domain/campaign/lookup";
import type {
  CampaignState,
  GameEvent,
  PlatformContent,
  ProductComponentKind,
  ProductOutcomeBand,
} from "@/src/domain/campaign/types";

/**
 * Product-side reading of a playthrough, derived entirely from the Event Log.
 *
 * This is a projection, not new instrumentation: it answers the questions an observed
 * playthrough needs to answer, using events the game already records. Two signals are
 * deliberately absent because nothing emits them yet — see `notInstrumented`.
 */

/**
 * What the player built and what they did with what the runs showed them.
 *
 * Every field that needs a run to exist is `undefined` until it does, never `false`: a player who
 * stopped before the first run has not failed these, they have not reached them.
 */
export type ProductReading = {
  reachedFirstRun: boolean;
  reachedLaunch: boolean;
  firstRunBands: ProductOutcomeBand[];
  finalRunBands: ProductOutcomeBand[];
  /** The first build, before any feedback, could not act without a human in the loop. */
  boundedOnFirstBuild?: boolean;
  /** After seeing it act unasked and being given two changes, it still can. */
  actsUnaskedAtFinish?: boolean;
  /** Components the first run named as the reason a scenario fell short. */
  faultsNamed: ProductComponentKind[];
  changedComponents: ProductComponentKind[];
  /** Every change the player spent went to something the run had named. */
  changesLinkedToEvidence?: boolean;
};

export type SessionReport = {
  campaignId: string;
  chapterId: string;
  startedAt?: string;
  lastEventAt?: string;
  elapsedMs?: number;
  opening: {
    completed: boolean;
    reachedBuild: boolean;
    abandonedBeforeBuild: boolean;
    answers: Record<string, string>;
    elapsedMs?: number;
  };
  scenesEntered: number;
  uniqueScenesEntered: number;
  retries: number;
  choices: Array<{ sceneId: string; choiceId: string; label: string; occurredAt: string }>;
  wrongAnswers: Array<{ sceneId: string; choiceId: string; label: string }>;
  product: ProductReading;
  codexUnlocked: string[];
  artifactsGenerated: string[];
  chapterCompleted: boolean;
  resets: number;
  notInstrumented: string[];
};

/**
 * The first milestone of the chapter: the player answered ZERO and reached the point where the
 * product starts being assembled.
 */
const buildStartSceneId = "02_problem";

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
  const buildStartedAt = firstSceneEntryAt(sceneEntries, buildStartSceneId);

  return {
    campaignId: state.campaignId,
    chapterId: chapter.id,
    startedAt,
    lastEventAt,
    elapsedMs: durationMs(startedAt, lastEventAt),
    opening: {
      completed: Boolean(buildStartedAt),
      reachedBuild: Boolean(buildStartedAt),
      abandonedBeforeBuild: !buildStartedAt,
      answers,
      elapsedMs: durationMs(startedAt, buildStartedAt),
    },
    scenesEntered: sceneEntries.length,
    uniqueScenesEntered: seenScenes.size,
    retries,
    choices,
    wrongAnswers,
    codexUnlocked: [...state.unlockedCodexEntryIds],
    artifactsGenerated: state.artifacts.map((artifact) => artifact.id),
    product: readProduct(state),
    // The chapter says when it is finished; the report no longer has to know a scene by name.
    chapterCompleted: events.some((event) => event.type === "chapter.completed"),
    resets: events.filter((event) => event.type === "campaign.reset_completed" || event.type === "campaign.reset").length,
    // Opening the Codex overlay and opening an artifact are UI-only today, so a session
    // report cannot show them.
    notInstrumented: ["codex.opened", "artifact.opened"],
  };
}

/**
 * The chapter's own reading of a run. The two signals that matter are whether the player's
 * changes went where the evidence pointed, and whether the product could still act unasked once
 * they were out of changes.
 */
function readProduct(state: CampaignState): ProductReading {
  const { firstRun, latestRun, rebuild, completed } = state.product;
  const firstRunBands = firstRun?.results.map((result) => result.band) ?? [];
  const finalRunBands = latestRun?.results.map((result) => result.band) ?? [];
  const faultsNamed = unique(
    (firstRun?.results ?? []).flatMap((result) => result.attribution.missing.map((reference) => reference.component)),
  );
  const changedComponents = rebuild.changes.map((change) => change.component);

  return {
    reachedFirstRun: firstRunBands.length > 0,
    reachedLaunch: completed,
    firstRunBands,
    finalRunBands,
    // Reaching a run is what makes these answerable at all.
    boundedOnFirstBuild: firstRunBands.length > 0 ? !firstRunBands.includes("unbounded") : undefined,
    actsUnaskedAtFinish: completed && finalRunBands.length > 0 ? finalRunBands.includes("unbounded") : undefined,
    faultsNamed,
    changedComponents,
    // Undecidable when the run named nothing to fix or the player changed nothing: there is no
    // link to make, and an absent link is not a failed one.
    changesLinkedToEvidence:
      faultsNamed.length > 0 && changedComponents.length > 0
        ? changedComponents.every((component) => faultsNamed.includes(component))
        : undefined,
  };
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
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

