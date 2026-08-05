import { createEvent } from "@/src/application/chapter-runner/chapterRunner";
import { generateArtifactRecord } from "@/src/engines/artifact/artifactEngine";
import { projectCampaign } from "@/src/engines/projection/projectCampaign";
import { countBudget, getSelection, requireProduct } from "@/src/engines/product/productBuilder";
import { getChapter, getScene } from "@/src/domain/campaign/lookup";
import type {
  CampaignState,
  EventType,
  GameEvent,
  PlatformContent,
  ProductComponentKind,
  ProductConfiguration,
  Scene,
  SceneCapability,
} from "@/src/domain/campaign/types";

/** Which event records a confirmed slot. One name per slot, so the log reads as a build order. */
const confirmEventByComponent: Record<ProductComponentKind, EventType> = {
  problem: "product.problem_selected",
  outcome: "product.outcome_selected",
  modelRole: "product.model_role_selected",
  context: "product.context_confirmed",
  tools: "product.tools_confirmed",
  boundaries: "product.boundaries_confirmed",
};

const singleSelectComponents: ProductComponentKind[] = ["problem", "outcome", "modelRole"];

/**
 * Which question the build scene is on. Derived from what the product already has rather than
 * stored, so reloading mid-build lands the player back where they were.
 */
export function currentBuildStep(capability: SceneCapability, configuration: ProductConfiguration) {
  const steps = capability.steps ?? [];
  const index = steps.findIndex((step) => getSelection(configuration, step.target).length === 0);

  return {
    index: index === -1 ? steps.length : index,
    step: index === -1 ? undefined : steps[index],
    isLast: index === steps.length - 1,
    total: steps.length,
  };
}

/**
 * Records one question of the build. Single-select slots carry `optionId`, multi-select slots
 * carry `optionIds`; both go through here so a scene never decides how the log is written. The
 * scene only moves on once its last question is answered.
 */
export function confirmCapability(params: {
  content: PlatformContent;
  state: CampaignState;
  optionIds: string[];
  occurredAt?: string;
}): CampaignState {
  const { scene, capability, chapter } = readCapability(params.content, params.state);

  if (capability.kind !== "build") {
    throw new Error(`Scene ${scene.id} is not a build step`);
  }

  const { step, isLast } = currentBuildStep(capability, params.state.product.configuration);

  if (!step) {
    throw new Error(`Scene ${scene.id} has no unanswered question left`);
  }

  if (params.optionIds.length < (step.minSelected ?? 1)) {
    throw new Error(`Step ${step.target} needs at least ${step.minSelected ?? 1} option(s)`);
  }

  const catalogue = requireProduct(chapter);
  const occurredAt = params.occurredAt ?? new Date().toISOString();
  const events = [...params.state.eventLog];
  const isSingle = singleSelectComponents.includes(step.target);
  const budget = step.target === "context" ? countBudget(catalogue, params.optionIds, step.budget) : undefined;

  events.push(
    createEvent(params.state.campaignId, events.length + 1, confirmEventByComponent[step.target], occurredAt, {
      chapterId: chapter.id,
      sceneId: scene.id,
      ...(isSingle ? { optionId: params.optionIds[0] } : { optionIds: params.optionIds }),
      ...(budget ? { limit: budget.limit, spent: budget.spent, overflow: budget.overflow } : {}),
    }),
  );

  if (!isLast) {
    return projectCampaign(params.content, events);
  }

  if (capability.createsVersion !== undefined) {
    events.push(
      createEvent(params.state.campaignId, events.length + 1, "product.configuration_created", occurredAt, {
        chapterId: chapter.id,
        version: capability.createsVersion,
      }),
    );
  }

  return advance(params.content, params.state, events, capability.nextSceneId, occurredAt, chapter.id);
}

/**
 * A tick in the context list. These are an audit trail — what the player added and took back —
 * and never the source of the configuration, which only a confirmation writes.
 */
export function recordContextToggle(params: {
  content: PlatformContent;
  state: CampaignState;
  optionId: string;
  selected: boolean;
  occurredAt?: string;
}): CampaignState {
  const { scene, chapter } = readCapability(params.content, params.state);
  const occurredAt = params.occurredAt ?? new Date().toISOString();
  const events = [
    ...params.state.eventLog,
    createEvent(
      params.state.campaignId,
      params.state.eventLog.length + 1,
      params.selected ? "product.context_item_selected" : "product.context_item_removed",
      occurredAt,
      { chapterId: chapter.id, sceneId: scene.id, optionId: params.optionId },
    ),
  ];

  return projectCampaign(params.content, events);
}

/** Runs the chapter's scenarios against the product as it stands and moves on to the readout. */
export function runTests(params: {
  content: PlatformContent;
  state: CampaignState;
  occurredAt?: string;
}): CampaignState {
  const { scene, capability, chapter } = readCapability(params.content, params.state);

  if (capability.kind !== "run-tests") {
    throw new Error(`Scene ${scene.id} is not a test step`);
  }

  const occurredAt = params.occurredAt ?? new Date().toISOString();
  const version = params.state.product.configuration.version;
  const events = [...params.state.eventLog];

  events.push(
    createEvent(params.state.campaignId, events.length + 1, "product.test_started", occurredAt, {
      chapterId: chapter.id,
      sceneId: scene.id,
      version,
    }),
    createEvent(params.state.campaignId, events.length + 2, "product.test_completed", occurredAt, {
      chapterId: chapter.id,
      sceneId: scene.id,
      version,
    }),
  );

  return advance(params.content, params.state, events, capability.nextSceneId, occurredAt, chapter.id);
}

/**
 * Swaps one component during the rebuild. The limit is the mechanic, not a warning: once the
 * allowance is spent the runner refuses, so no path through the UI can hand out a third change.
 */
export function changeComponent(params: {
  content: PlatformContent;
  state: CampaignState;
  component: ProductComponentKind;
  optionIds: string[];
  occurredAt?: string;
}): CampaignState {
  const { scene, capability, chapter } = readCapability(params.content, params.state);

  if (capability.kind !== "rebuild") {
    throw new Error(`Scene ${scene.id} is not a rebuild step`);
  }

  const maxChanges = capability.maxChanges ?? 0;
  const used = params.state.product.rebuild.changes.length;

  if (used >= maxChanges) {
    throw new Error(`Rebuild allows ${maxChanges} changes and ${used} have been made`);
  }

  const occurredAt = params.occurredAt ?? new Date().toISOString();
  const events = [
    ...params.state.eventLog,
    createEvent(params.state.campaignId, params.state.eventLog.length + 1, "product.component_changed", occurredAt, {
      chapterId: chapter.id,
      sceneId: scene.id,
      component: params.component,
      optionIds: params.optionIds,
      maxChanges,
    }),
  ];

  return projectCampaign(params.content, events);
}

/**
 * Closes the rebuild and, with it, the chapter: the product is snapshotted again so the two
 * versions can be compared, and everything the chapter promised to hand over — its Codex entries
 * and its artifacts — is written from `chapter.yml` rather than from a hardcoded list here.
 */
export function confirmRebuild(params: {
  content: PlatformContent;
  state: CampaignState;
  occurredAt?: string;
}): CampaignState {
  const { scene, capability, chapter } = readCapability(params.content, params.state);

  if (capability.kind !== "rebuild") {
    throw new Error(`Scene ${scene.id} is not a rebuild step`);
  }

  const occurredAt = params.occurredAt ?? new Date().toISOString();
  const events = [...params.state.eventLog];

  events.push(
    createEvent(params.state.campaignId, events.length + 1, "product.rebuild_confirmed", occurredAt, {
      chapterId: chapter.id,
      sceneId: scene.id,
      version: capability.createsVersion ?? params.state.product.configuration.version + 1,
    }),
  );

  for (const entryId of chapter.codexEntryIds) {
    events.push(
      createEvent(params.state.campaignId, events.length + 1, "codex.entry_unlocked", occurredAt, {
        entryId,
        chapterId: chapter.id,
      }),
    );
  }

  events.push(
    createEvent(params.state.campaignId, events.length + 1, "chapter.completed", occurredAt, {
      chapterId: chapter.id,
    }),
  );

  // The Blueprint is generated against the finished product, so it has to be built from the
  // state the events above produce, not from the state the player confirmed from.
  let nextState = projectCampaign(params.content, events);

  for (const artifactId of chapter.artifactIds) {
    const artifact = generateArtifactRecord({ content: params.content, state: nextState, artifactId, occurredAt });
    events.push(
      createEvent(params.state.campaignId, events.length + 1, "artifact.generated", occurredAt, {
        artifactId,
        artifact,
      }),
    );
    nextState = projectCampaign(params.content, events);
  }

  return advance(params.content, params.state, events, capability.nextSceneId, occurredAt, chapter.id);
}

export function readCapability(content: PlatformContent, state: CampaignState) {
  const chapter = getChapter(content, state.currentChapterId);
  const scene: Scene = getScene(chapter, state.currentSceneId);

  if (!scene.capability) {
    throw new Error(`Scene ${scene.id} declares no capability`);
  }

  return { chapter, scene, capability: scene.capability };
}

function advance(
  content: PlatformContent,
  state: CampaignState,
  events: GameEvent[],
  nextSceneId: string | undefined,
  occurredAt: string,
  chapterId: string,
) {
  if (nextSceneId) {
    events.push(
      createEvent(state.campaignId, events.length + 1, "scene.entered", occurredAt, {
        chapterId,
        sceneId: nextSceneId,
      }),
    );
  }

  return projectCampaign(content, events);
}
