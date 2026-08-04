import { applyDecisionEffects } from "@/src/engines/simulation/simulationRules";
import {
  collectConfigurationEffects,
  currentActionRisk,
  getProblem,
} from "@/src/engines/product/productBuilder";
import { describeSelection } from "@/src/engines/projection/projectProduct";
import { projectPlayerMetrics } from "@/src/engines/projection/projectPlayerMetrics";
import type {
  CampaignState,
  Chapter,
  PlatformContent,
  ProductCatalogue,
  ProductConfiguration,
  ProductRun,
  ProductTestResult,
} from "@/src/domain/campaign/types";

const bandLabels: Record<ProductTestResult["band"], string> = {
  served: "сработало",
  partial: "наполовину",
  unserved: "не сработало",
  unbounded: "без спроса",
};

const pending = "Решение ещё не принято.";

/**
 * Renders one Blueprint section. Every section reads the product the player actually built, so
 * a section with nothing behind it says so instead of inventing content.
 */
export function renderBlueprintSection(params: {
  sectionId: string;
  content: PlatformContent;
  chapter: Chapter;
  state: CampaignState;
}): string {
  const { chapter, state } = params;
  const catalogue = chapter.product;

  if (!catalogue) {
    return pending;
  }

  const product = state.product;
  const configuration = product.configuration;
  const problem = getProblem(catalogue, configuration.problemId);

  switch (params.sectionId) {
    case "user":
      return problem?.user ?? pending;
    case "problem":
      return problem ? `${problem.label}\n\n> ${problem.signal}` : pending;
    case "outcome":
      return describeSelection(catalogue, configuration, "outcome");
    case "model-role":
      return describeSelection(catalogue, configuration, "modelRole");
    case "context":
      return describeSelection(catalogue, configuration, "context");
    case "context-budget":
      return renderBudget(configuration);
    case "tools":
      return describeSelection(catalogue, configuration, "tools");
    case "boundaries":
      return describeSelection(catalogue, configuration, "boundaries");
    case "first-configuration":
      return renderConfiguration(catalogue, product.configurationByVersion[1]);
    case "first-results":
      return renderRun(product.firstRun);
    case "changes":
      return renderChanges(state);
    case "final-configuration":
      return renderConfiguration(catalogue, configuration);
    case "final-results":
      return renderRun(product.latestRun);
    case "tradeoffs":
      return renderTradeoffs(params.content, chapter, product.configurationByVersion[1], configuration);
    case "belief":
      return state.variables.belief ? `«${state.variables.belief}»` : pending;
    case "axiom":
      return chapter.codexEntryIds
        .map((entryId) => params.content.codexEntryById[entryId]?.title)
        .filter(Boolean)
        .join("\n") || pending;
    default:
      return pending;
  }
}

function renderBudget(configuration: ProductConfiguration) {
  if (configuration.contextLimit === 0) {
    return pending;
  }

  const spent = `Потрачено ${configuration.contextSpent} из ${configuration.contextLimit}.`;

  return configuration.contextOverflow > 0
    ? `${spent} Превышение на ${configuration.contextOverflow} — продукт получил больше материала, чем успевает разобрать.`
    : `${spent} В пределах бюджета.`;
}

function renderConfiguration(catalogue: ProductCatalogue, configuration?: ProductConfiguration) {
  if (!configuration) {
    return pending;
  }

  return [
    `- Роль модели: ${describeSelection(catalogue, configuration, "modelRole")}`,
    `- Контекст: ${describeSelection(catalogue, configuration, "context")}`,
    `- Инструменты: ${describeSelection(catalogue, configuration, "tools")}`,
    `- Границы: ${describeSelection(catalogue, configuration, "boundaries")}`,
  ].join("\n");
}

function renderRun(run?: ProductRun) {
  if (!run || run.results.length === 0) {
    return pending;
  }

  return run.results
    .map((result) => {
      const missing = result.attribution.missing.map((reference) => reference.label).join(", ");
      const lines = [
        `### ${result.title} — ${bandLabels[result.band]}`,
        `- Хотел: ${result.wanted}`,
        `- Продукт: ${result.did}`,
        `- Человек получил: ${result.got}`,
      ];

      if (missing) {
        lines.push(`- Не хватило: ${missing}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

function renderChanges(state: CampaignState) {
  const changes = state.product.rebuild.changes;

  if (changes.length === 0) {
    return "Ничего не менялось.";
  }

  return changes.map((change) => `- ${change.component}: ${change.fromLabel} → ${change.toLabel}`).join("\n");
}

/**
 * What the rebuild bought and what it cost, read off the six numbers the player was shown rather
 * than off the twelve fields behind them.
 */
function renderTradeoffs(
  content: PlatformContent,
  chapter: Chapter,
  before?: ProductConfiguration,
  after?: ProductConfiguration,
) {
  if (!chapter.product || !before || !after) {
    return pending;
  }

  const beforeMetrics = metricsFor(content, chapter, before);
  const afterMetrics = metricsFor(content, chapter, after);
  const rows = afterMetrics.metrics
    .map((metric) => {
      const delta = metric.value - beforeMetrics.byKey[metric.key].value;
      return { metric, delta };
    })
    .filter((row) => row.delta !== 0)
    .sort((first, second) => Math.abs(second.delta) - Math.abs(first.delta));

  if (rows.length === 0) {
    return "Ничего не сдвинулось.";
  }

  return rows
    .map(({ metric, delta }) => {
      const improved = metric.betterWhen === "higher" ? delta > 0 : delta < 0;
      return `- ${metric.label}: ${delta > 0 ? `+${delta}` : delta} (${improved ? "лучше" : "хуже"})`;
    })
    .join("\n");
}

function metricsFor(content: PlatformContent, chapter: Chapter, configuration: ProductConfiguration) {
  const catalogue = chapter.product;

  return projectPlayerMetrics({
    systemState: applyDecisionEffects(
      chapter.initialSystemState,
      catalogue ? collectConfigurationEffects(catalogue, configuration) : {},
    ),
    currentActionRisk: catalogue ? currentActionRisk(catalogue, configuration) : 0,
    labels: content.playerMetricLabels,
  });
}
