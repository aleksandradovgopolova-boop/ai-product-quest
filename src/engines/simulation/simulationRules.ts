import type { DecisionEffects, SystemState } from "@/src/domain/campaign/types";

const minMetric = 0;
const maxMetric = 100;

export function applyDecisionEffects(state: SystemState, effects: DecisionEffects = {}): SystemState {
  const nextState = { ...state };

  for (const [metric, delta] of Object.entries(effects)) {
    if (typeof delta !== "number" || !(metric in nextState)) {
      continue;
    }

    const key = metric as keyof SystemState;
    nextState[key] = clampMetric(nextState[key] + delta);
  }

  return nextState;
}

export function clampMetric(value: number) {
  return Math.max(minMetric, Math.min(maxMetric, Math.round(value)));
}
