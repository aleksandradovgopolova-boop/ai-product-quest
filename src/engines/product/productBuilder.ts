import type {
  Chapter,
  ContextBudget,
  DecisionEffects,
  ProductCatalogue,
  ProductComponentKind,
  ProductConfiguration,
  ProductOption,
  ProductProblem,
  SceneCapability,
} from "@/src/domain/campaign/types";

export const emptyConfiguration: ProductConfiguration = {
  contextItemIds: [],
  toolIds: [],
  boundaryIds: [],
  version: 0,
  contextSpent: 0,
  contextLimit: 0,
  contextOverflow: 0,
};

export const allProductComponents: ProductComponentKind[] = [
  "problem",
  "outcome",
  "modelRole",
  "context",
  "tools",
  "boundaries",
];

/**
 * What a player may swap during the rebuild. The problem itself is not on the list: changing it
 * would replace the outcomes and the scenarios underneath, so the before/after would compare two
 * different products rather than two versions of one.
 */
export const rebuildableComponents: ProductComponentKind[] = [
  "outcome",
  "modelRole",
  "context",
  "tools",
  "boundaries",
];

export function getProblem(catalogue: ProductCatalogue, problemId?: string): ProductProblem | undefined {
  return catalogue.problems.find((problem) => problem.id === problemId);
}

/**
 * Every component reads from a different list, but the rest of the engine only ever wants
 * "the options for this slot" — including the outcomes, which live inside the chosen problem.
 */
export function getOptions(
  catalogue: ProductCatalogue,
  component: ProductComponentKind,
  configuration: ProductConfiguration,
): ProductOption[] {
  switch (component) {
    case "problem":
      return catalogue.problems.map((problem) => ({
        id: problem.id,
        label: problem.label,
        note: problem.signal,
      }));
    case "outcome":
      return getProblem(catalogue, configuration.problemId)?.outcomes ?? [];
    case "modelRole":
      return catalogue.modelRoles;
    case "context":
      return catalogue.contextItems;
    case "tools":
      return catalogue.tools;
    case "boundaries":
      return catalogue.boundaries;
  }
}

export function getOption(
  catalogue: ProductCatalogue,
  component: ProductComponentKind,
  optionId: string,
  configuration: ProductConfiguration,
): ProductOption | undefined {
  return getOptions(catalogue, component, configuration).find((option) => option.id === optionId);
}

/** What the player currently has in a slot, as a list, so single and multi slots read alike. */
export function getSelection(configuration: ProductConfiguration, component: ProductComponentKind): string[] {
  switch (component) {
    case "problem":
      return configuration.problemId ? [configuration.problemId] : [];
    case "outcome":
      return configuration.outcomeId ? [configuration.outcomeId] : [];
    case "modelRole":
      return configuration.modelRoleId ? [configuration.modelRoleId] : [];
    case "context":
      return configuration.contextItemIds;
    case "tools":
      return configuration.toolIds;
    case "boundaries":
      return configuration.boundaryIds;
  }
}

export function withSelection(
  configuration: ProductConfiguration,
  component: ProductComponentKind,
  optionIds: string[],
): ProductConfiguration {
  switch (component) {
    case "problem":
      // A different problem brings different outcomes, so the old one cannot survive the swap.
      return { ...configuration, problemId: optionIds[0], outcomeId: undefined };
    case "outcome":
      return { ...configuration, outcomeId: optionIds[0] };
    case "modelRole":
      return { ...configuration, modelRoleId: optionIds[0] };
    case "context":
      return { ...configuration, contextItemIds: [...optionIds] };
    case "tools":
      return { ...configuration, toolIds: [...optionIds] };
    case "boundaries":
      return { ...configuration, boundaryIds: [...optionIds] };
  }
}

export function countBudget(catalogue: ProductCatalogue, optionIds: string[], budget?: ContextBudget) {
  const spent = optionIds.reduce((total, optionId) => {
    const item = catalogue.contextItems.find((candidate) => candidate.id === optionId);
    return total + (item?.cost ?? 0);
  }, 0);
  const limit = budget?.limit ?? 0;

  return {
    spent,
    limit,
    // Going over is allowed on purpose: the overflow is what the test scenarios later price.
    overflow: limit > 0 ? Math.max(0, spent - limit) : 0,
  };
}

/** Everything the current configuration makes the product able to do. */
export function collectProvidedTokens(
  catalogue: ProductCatalogue,
  configuration: ProductConfiguration,
  component: ProductComponentKind,
): Set<string> {
  const tokens = new Set<string>();

  for (const optionId of getSelection(configuration, component)) {
    const option = getOption(catalogue, component, optionId, configuration);

    for (const token of option?.provides ?? []) {
      tokens.add(token);
    }
  }

  return tokens;
}

/** What the chosen boundaries keep the product from doing on its own. */
export function collectMitigatedTokens(catalogue: ProductCatalogue, configuration: ProductConfiguration): Set<string> {
  const tokens = new Set<string>();

  for (const boundaryId of configuration.boundaryIds) {
    const boundary = catalogue.boundaries.find((candidate) => candidate.id === boundaryId);

    for (const token of boundary?.mitigates ?? []) {
      tokens.add(token);
    }
  }

  return tokens;
}

/**
 * How much the product can do without anyone in the loop: the risk its role and tools carry,
 * minus what a boundary explicitly takes back, plus what an overloaded context adds by making
 * the product act on material nobody reviewed.
 */
export function currentActionRisk(catalogue: ProductCatalogue, configuration: ProductConfiguration) {
  const mitigated = collectMitigatedTokens(catalogue, configuration);
  const risky: ProductOption[] = [
    ...catalogue.modelRoles.filter((role) => role.id === configuration.modelRoleId),
    ...catalogue.tools.filter((tool) => configuration.toolIds.includes(tool.id)),
  ];

  const raw = risky.reduce((total, option) => {
    const covered = (option.provides ?? []).some((token) => mitigated.has(token));
    return total + (covered ? 0 : (option.risk ?? 0));
  }, 0);

  return clampMetricValue(raw + configuration.contextOverflow * 4);
}

/** The combined effect of every chosen component on the twelve-field system state. */
export function collectConfigurationEffects(
  catalogue: ProductCatalogue,
  configuration: ProductConfiguration,
): DecisionEffects {
  const effects: DecisionEffects = {};
  const chosen: Array<ProductOption | undefined> = [
    getProblem(catalogue, configuration.problemId)?.outcomes.find((outcome) => outcome.id === configuration.outcomeId),
    catalogue.modelRoles.find((role) => role.id === configuration.modelRoleId),
    ...configuration.contextItemIds.map((id) => catalogue.contextItems.find((item) => item.id === id)),
    ...configuration.toolIds.map((id) => catalogue.tools.find((tool) => tool.id === id)),
    ...configuration.boundaryIds.map((id) => catalogue.boundaries.find((boundary) => boundary.id === id)),
  ];

  for (const option of chosen) {
    for (const [metric, delta] of Object.entries(option?.effects ?? {})) {
      const key = metric as keyof DecisionEffects;
      effects[key] = (effects[key] ?? 0) + delta;
    }
  }

  return effects;
}

/**
 * Which question a build scene is on. Derived from what the product already has rather than
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

/** A slot filled only with options that give the product nothing is the same as an empty slot. */
export function selectionIsInert(
  catalogue: ProductCatalogue,
  configuration: ProductConfiguration,
  component: "tools" | "boundaries",
): boolean {
  const selected = getSelection(configuration, component);

  if (selected.length === 0) {
    return false;
  }

  return selected.every((optionId) => {
    const option = getOption(catalogue, component, optionId, configuration);
    const carried = component === "tools" ? option?.provides : option?.mitigates;

    return (carried ?? []).length === 0;
  });
}

export function requireProduct(chapter: Chapter): ProductCatalogue {
  if (!chapter.product) {
    throw new Error(`Chapter ${chapter.id} has no product catalogue`);
  }

  return chapter.product;
}

function clampMetricValue(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
