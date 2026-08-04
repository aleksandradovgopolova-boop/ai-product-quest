import {
  countBudget,
  emptyConfiguration,
  getOption,
  getSelection,
  rebuildableComponents,
  withSelection,
} from "@/src/engines/product/productBuilder";
import { runProductTests } from "@/src/engines/product/productTesting";
import type {
  EventType,
  GameEvent,
  ProductCatalogue,
  ProductComponentChange,
  ProductComponentKind,
  ProductConfiguration,
  ProductProjection,
} from "@/src/domain/campaign/types";

/** Single-select events, each naming the slot it fills. */
const selectionComponentByEvent: Partial<Record<EventType, ProductComponentKind>> = {
  "product.problem_selected": "problem",
  "product.outcome_selected": "outcome",
  "product.model_role_selected": "modelRole",
};

/** Multi-select confirmations. The per-item toggles before them are an audit trail, not state. */
const confirmComponentByEvent: Partial<Record<EventType, ProductComponentKind>> = {
  "product.context_confirmed": "context",
  "product.tools_confirmed": "tools",
  "product.boundaries_confirmed": "boundaries",
};

export const emptyProductProjection: ProductProjection = {
  configuration: emptyConfiguration,
  configurationByVersion: {},
  rebuild: { changes: [], maxChanges: 0, confirmed: false },
  completed: false,
};

/**
 * Folds the Event Log into the product the player has built. Test results are never read from
 * the log: they are recomputed from the configuration snapshot of each version, so a run and its
 * rebuild can be compared without trusting two separately written records to agree.
 */
export function projectProduct(catalogue: ProductCatalogue | undefined, eventLog: GameEvent[]): ProductProjection {
  if (!catalogue) {
    return emptyProductProjection;
  }

  let configuration: ProductConfiguration = { ...emptyConfiguration };
  const configurationByVersion: Record<number, ProductConfiguration> = {};
  const changes: ProductComponentChange[] = [];
  let maxChanges = 0;
  let rebuildConfirmed = false;
  let completed = false;

  for (const event of eventLog) {
    const selectionComponent = selectionComponentByEvent[event.type];

    if (selectionComponent) {
      const optionId = readString(event.payload.optionId);
      configuration = optionId ? withSelection(configuration, selectionComponent, [optionId]) : configuration;
      continue;
    }

    const confirmComponent = confirmComponentByEvent[event.type];

    if (confirmComponent) {
      configuration = withSelection(configuration, confirmComponent, readStrings(event.payload.optionIds));

      if (confirmComponent === "context") {
        const budget = countBudget(catalogue, configuration.contextItemIds, {
          limit: readNumber(event.payload.limit) ?? 0,
          label: "",
        });
        configuration = {
          ...configuration,
          contextSpent: budget.spent,
          contextLimit: budget.limit,
          contextOverflow: budget.overflow,
        };
      }

      continue;
    }

    switch (event.type) {
      case "product.configuration_created": {
        const version = readNumber(event.payload.version) ?? configuration.version + 1;
        configuration = { ...configuration, version };
        configurationByVersion[version] = configuration;
        break;
      }
      case "product.component_changed": {
        const component = readComponent(event.payload.component);

        if (!component) {
          break;
        }

        maxChanges = readNumber(event.payload.maxChanges) ?? maxChanges;
        const before = describeSelection(catalogue, configuration, component);
        const optionIds = readStrings(event.payload.optionIds);
        let next = withSelection(configuration, component, optionIds);

        if (component === "context") {
          const budget = countBudget(catalogue, next.contextItemIds, {
            limit: next.contextLimit,
            label: "",
          });
          next = { ...next, contextSpent: budget.spent, contextOverflow: budget.overflow };
        }

        configuration = next;
        changes.push({
          component,
          fromLabel: before,
          toLabel: describeSelection(catalogue, configuration, component),
        });
        break;
      }
      case "product.rebuild_confirmed": {
        rebuildConfirmed = true;
        const version = readNumber(event.payload.version) ?? configuration.version + 1;
        configuration = { ...configuration, version };
        configurationByVersion[version] = configuration;
        break;
      }
      case "chapter.completed":
        completed = true;
        break;
    }
  }

  const versions = Object.keys(configurationByVersion)
    .map(Number)
    .sort((first, second) => first - second);
  const firstVersion = versions[0];
  const latestVersion = versions.at(-1);

  return {
    configuration,
    configurationByVersion,
    firstRun: firstVersion === undefined ? undefined : runProductTests(catalogue, configurationByVersion[firstVersion]),
    latestRun:
      latestVersion === undefined ? undefined : runProductTests(catalogue, configurationByVersion[latestVersion]),
    rebuild: { changes, maxChanges, confirmed: rebuildConfirmed },
    completed,
  };
}

/** A slot's current contents in words, so a rebuild can be shown as "this became that". */
export function describeSelection(
  catalogue: ProductCatalogue,
  configuration: ProductConfiguration,
  component: ProductComponentKind,
) {
  const labels = getSelection(configuration, component)
    .map((optionId) => getOption(catalogue, component, optionId, configuration)?.label ?? optionId)
    .filter(Boolean);

  return labels.length > 0 ? labels.join(", ") : "не выбрано";
}

function readComponent(value: unknown): ProductComponentKind | undefined {
  return typeof value === "string" && (rebuildableComponents as string[]).includes(value)
    ? (value as ProductComponentKind)
    : undefined;
}

function readString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
