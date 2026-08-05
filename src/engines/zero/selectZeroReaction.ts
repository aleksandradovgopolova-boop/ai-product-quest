import { countBudget, currentBuildStep, selectionIsInert, withSelection } from "@/src/engines/product/productBuilder";
import type {
  Chapter,
  ContextBudget,
  HumorLevel,
  ProductCatalogue,
  ProductComponentKind,
  ProductConfiguration,
  ProductProjection,
  Scene,
  ZeroReaction,
  ZeroTrigger,
} from "@/src/domain/campaign/types";

/**
 * What the player has ticked but not yet confirmed. ZERO reacts to it because the moment the
 * budget goes over is the moment the remark lands — after the step is committed it is too late
 * to be useful and too late to be funny.
 */
export type ZeroDraft = {
  component: ProductComponentKind;
  optionIds: string[];
  budget?: ContextBudget;
};

export type ZeroPresentation = {
  reaction: ZeroReaction;
  /** The line for the requested humour level, falling back to a quieter one when absent. */
  line: string;
};

/**
 * What ZERO is doing right now. Pure, and derived from the projection rather than from a scene
 * name or an option id: content can rename a component without silencing ZERO, and ZERO can
 * never change the campaign because it never sees a way to.
 */
export function selectZeroReaction(params: {
  chapter: Chapter;
  scene: Scene;
  product: ProductProjection;
  isProcessing: boolean;
  humor: HumorLevel;
  draft?: ZeroDraft;
}): ZeroPresentation | undefined {
  const catalogue = params.chapter.zero;

  if (!catalogue) {
    return undefined;
  }

  const active = new Set(activeTriggers(params));
  // Several conditions are usually live at once — a build step and an overloaded budget, say.
  // The sharpest observation wins, which is what `priority` orders.
  const reaction = catalogue.reactions
    .filter((candidate) => active.has(candidate.trigger))
    .sort((first, second) => second.priority - first.priority)[0];

  if (!reaction) {
    return undefined;
  }

  return { reaction, line: pickLine(reaction, params.humor) };
}

/** Humour never invents a line: a level with nothing written for it falls back to a quieter one. */
export function pickLine(reaction: ZeroReaction, humor: HumorLevel): string {
  if (humor === "maximum") {
    return reaction.lines.maximum ?? reaction.lines.normal ?? reaction.lines.minimal;
  }

  if (humor === "normal") {
    return reaction.lines.normal ?? reaction.lines.minimal;
  }

  return reaction.lines.minimal;
}

export function activeTriggers(params: {
  chapter: Chapter;
  scene: Scene;
  product: ProductProjection;
  isProcessing: boolean;
  draft?: ZeroDraft;
}): ZeroTrigger[] {
  const triggers: ZeroTrigger[] = [];
  const { product, scene } = params;
  const catalogue = params.chapter.product;
  const configuration = product.configuration;
  // The build step is read from what is committed, so an unconfirmed tick cannot make the
  // current question look answered. Everything else is read from what the player is holding.
  const effective = applyDraft(configuration, catalogue, params.draft);

  if (params.isProcessing) {
    triggers.push("system.processing");
  }

  if (product.completed) {
    triggers.push("chapter.complete");
  }

  const results = product.latestRun?.results ?? [];

  if (results.length > 0) {
    if (results.some((result) => result.band === "unbounded")) {
      triggers.push("run.unbounded");
    } else if (results.every((result) => result.band === "served")) {
      triggers.push("run.all-served");
    } else {
      triggers.push("run.mixed");
    }
  }

  if (effective.contextOverflow > 0) {
    triggers.push("context.overflow");
  }

  if (catalogue) {
    // "No boundaries" is not an id to look for: it is a slot filled with options that hold
    // nothing back, which is derivable from the catalogue itself.
    if (selectionIsInert(catalogue, effective, "boundaries")) {
      triggers.push("boundaries.none");
    }

    if (selectionIsInert(catalogue, effective, "tools")) {
      triggers.push("tools.none");
    }
  }

  const capability = scene.capability;

  if (capability?.kind === "build") {
    const step = currentBuildStep(capability, configuration).step;

    if (step) {
      triggers.push(`build.${step.target}` as ZeroTrigger);
    }
  }

  if (capability?.kind === "rebuild") {
    const spent = product.rebuild.changes.length >= (capability.maxChanges ?? 0);
    triggers.push(spent ? "rebuild.spent" : "rebuild.open");
  }

  if ((scene.choices ?? []).length > 0) {
    triggers.push("scene.waiting");
  }

  // Always live, and always the lowest priority: ZERO is never without something to be.
  triggers.push("chapter.opening");

  return triggers;
}

/** Lays an unconfirmed selection over the committed product, budget included. */
function applyDraft(
  configuration: ProductConfiguration,
  catalogue: ProductCatalogue | undefined,
  draft?: ZeroDraft,
): ProductConfiguration {
  if (!draft || !catalogue || draft.optionIds.length === 0) {
    return configuration;
  }

  const next = withSelection(configuration, draft.component, draft.optionIds);

  if (draft.component !== "context") {
    return next;
  }

  const budget = countBudget(catalogue, draft.optionIds, draft.budget);

  return { ...next, contextSpent: budget.spent, contextOverflow: budget.overflow };
}
