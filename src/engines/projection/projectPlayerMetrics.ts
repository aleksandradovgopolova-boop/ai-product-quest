import { clampMetric } from "@/src/engines/simulation/simulationRules";
import type {
  Chapter01SystemMetrics,
  PlayerMetric,
  PlayerMetricKey,
  SystemState,
} from "@/src/domain/campaign/types";

/**
 * Weights for the risk readout. They sum to 1, so risk stays on the same 0–100 scale as every
 * other number the player sees and a change in one input cannot quietly dominate the rest.
 */
const riskWeights = {
  security: 0.3,
  resilience: 0.25,
  technicalDebt: 0.2,
  organisationalDebt: 0.1,
  currentActionRisk: 0.15,
} as const;

const betterWhenByKey: Record<PlayerMetricKey, PlayerMetric["betterWhen"]> = {
  usefulness: "higher",
  quality: "higher",
  trust: "higher",
  speed: "higher",
  cost: "lower",
  risk: "lower",
};

const fallbackLabels: Record<PlayerMetricKey, string> = {
  usefulness: "Полезность",
  quality: "Качество",
  trust: "Доверие",
  speed: "Скорость",
  cost: "Стоимость",
  risk: "Риск",
};

/**
 * The six numbers the player is shown, derived from the full twelve-field system state. The UI
 * never reads `SystemState` itself: keeping the formulas here is what stops two screens from
 * disagreeing about what "risk" means.
 */
export function projectPlayerMetrics(params: {
  systemState: SystemState;
  currentActionRisk: number;
  labels?: Record<string, string>;
}): Chapter01SystemMetrics {
  const { systemState } = params;
  const values: Record<PlayerMetricKey, number> = {
    usefulness: clampMetric(systemState.usefulness),
    quality: clampMetric(systemState.quality),
    trust: clampMetric(systemState.trust),
    // Latency is a delay: the less of it there is, the faster the product feels.
    speed: clampMetric(100 - systemState.latency),
    cost: clampMetric(systemState.cost),
    risk: projectRisk(systemState, params.currentActionRisk),
  };

  const metrics = (Object.keys(values) as PlayerMetricKey[]).map<PlayerMetric>((key) => ({
    key,
    label: params.labels?.[key] ?? fallbackLabels[key],
    value: values[key],
    betterWhen: betterWhenByKey[key],
  }));

  return {
    metrics,
    byKey: Object.fromEntries(metrics.map((metric) => [metric.key, metric])) as Chapter01SystemMetrics["byKey"],
  };
}

/**
 * Risk is what the product can get wrong and what nobody would catch. Security and resilience
 * count as their shortfall — a system that is 70 secure carries 30 of risk — while the two debts
 * and the freedom of the current configuration count as themselves.
 */
export function projectRisk(systemState: SystemState, currentActionRisk: number) {
  return clampMetric(
    riskWeights.security * (100 - systemState.security) +
      riskWeights.resilience * (100 - systemState.resilience) +
      riskWeights.technicalDebt * systemState.technicalDebt +
      riskWeights.organisationalDebt * systemState.organisationalDebt +
      riskWeights.currentActionRisk * clampMetric(currentActionRisk),
  );
}
