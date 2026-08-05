import {
  collectMitigatedTokens,
  collectProvidedTokens,
  getOption,
  getProblem,
  getSelection,
} from "@/src/engines/product/productBuilder";
import type {
  ProductAttribution,
  ProductCatalogue,
  ProductComponentKind,
  ProductComponentReference,
  ProductConfiguration,
  ProductOutcomeBand,
  ProductRun,
  ProductTestResult,
  ProductTestScenario,
} from "@/src/domain/campaign/types";

/** Components a scenario can demand capability from. Boundaries are graded separately: they are
 * not something the product gains, they are something that holds it back. */
const capabilityComponents: ProductComponentKind[] = ["modelRole", "context", "tools"];

/**
 * Runs the chapter's three scenarios against a configuration. Pure: the same configuration and
 * the same catalogue always produce the same reading, which is what lets the rebuild be shown
 * as a before/after instead of two separate rolls.
 */
export function runProductTests(catalogue: ProductCatalogue, configuration: ProductConfiguration): ProductRun {
  const problem = getProblem(catalogue, configuration.problemId);

  return {
    version: configuration.version,
    results: (problem?.scenarios ?? []).map((scenario) => runScenario(catalogue, configuration, scenario)),
  };
}

export function runScenario(
  catalogue: ProductCatalogue,
  configuration: ProductConfiguration,
  scenario: ProductTestScenario,
): ProductTestResult {
  const carried: ProductComponentReference[] = [];
  const missing: ProductComponentReference[] = [];
  let requiredCount = 0;
  let missingCount = 0;

  for (const component of capabilityComponents) {
    const required = scenario.requires?.[component] ?? [];
    const provided = collectProvidedTokens(catalogue, configuration, component);

    for (const token of required) {
      requiredCount += 1;

      if (provided.has(token)) {
        carried.push(...findProviders(catalogue, configuration, component, token));
        continue;
      }

      missingCount += 1;
      missing.push({ component, optionId: token, label: capabilityLabel(catalogue, token) });
    }
  }

  const unguarded = findUnguardedTokens(catalogue, configuration, scenario);

  for (const token of unguarded) {
    missing.push({
      component: "boundaries",
      optionId: token,
      label: `ограничение на «${capabilityLabel(catalogue, token)}»`,
    });
  }

  const band = gradeScenario({
    scenario,
    configuration,
    requiredCount,
    missingCount,
    unguardedCount: unguarded.length,
  });
  const narration = scenario.outcomes[band];

  return {
    scenarioId: scenario.id,
    kind: scenario.kind,
    title: scenario.title,
    band,
    wanted: scenario.wanted,
    did: narration.did,
    got: narration.got,
    attribution: dedupeAttribution({ carried, missing }),
  };
}

function gradeScenario(params: {
  scenario: ProductTestScenario;
  configuration: ProductConfiguration;
  requiredCount: number;
  missingCount: number;
  unguardedCount: number;
}): ProductOutcomeBand {
  // Nothing holding the product back outranks everything else: the product did the thing, and
  // the fact that it could is the result.
  if (params.unguardedCount > 0) {
    return "unbounded";
  }

  if (params.requiredCount > 0 && params.missingCount === params.requiredCount) {
    return "unserved";
  }

  if (params.missingCount > 0) {
    return "partial";
  }

  // An overloaded context does not break the ordinary case, it breaks the one where the material
  // is thin or contradictory: more noise to pick the wrong line out of.
  if (params.scenario.kind === "thin-context" && params.configuration.contextOverflow > 0) {
    return "partial";
  }

  return "served";
}

/** A guard only matters when the product actually has the capability it would hold back. */
function findUnguardedTokens(
  catalogue: ProductCatalogue,
  configuration: ProductConfiguration,
  scenario: ProductTestScenario,
) {
  const guarded = scenario.requires?.boundaries ?? [];

  if (guarded.length === 0) {
    return [];
  }

  const mitigated = collectMitigatedTokens(catalogue, configuration);
  const reachable = new Set<string>([
    ...collectProvidedTokens(catalogue, configuration, "tools"),
    ...collectProvidedTokens(catalogue, configuration, "modelRole"),
  ]);

  return guarded.filter((token) => reachable.has(token) && !mitigated.has(token));
}

function findProviders(
  catalogue: ProductCatalogue,
  configuration: ProductConfiguration,
  component: ProductComponentKind,
  token: string,
): ProductComponentReference[] {
  return getSelection(configuration, component)
    .map((optionId) => getOption(catalogue, component, optionId, configuration))
    .filter((option) => option?.provides?.includes(token))
    .map((option) => ({ component, optionId: option?.id ?? token, label: option?.label ?? token }));
}

function capabilityLabel(catalogue: ProductCatalogue, token: string) {
  return catalogue.capabilities[token] ?? token;
}

function dedupeAttribution(attribution: ProductAttribution): ProductAttribution {
  return {
    carried: dedupeReferences(attribution.carried),
    missing: dedupeReferences(attribution.missing),
  };
}

function dedupeReferences(references: ProductComponentReference[]) {
  const seen = new Set<string>();

  return references.filter((reference) => {
    const key = `${reference.component}:${reference.optionId}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}
