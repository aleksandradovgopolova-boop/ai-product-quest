import type { HumorLevel } from "@/src/domain/campaign/types";

/**
 * How loud ZERO is kept out of the campaign Event Log on purpose. It is a preference about how
 * the game talks, not something the player did inside it: replaying a log must not replay a
 * settings change, and changing the setting must not add a step to the run's history.
 */
export const humorStorageKey = "ai-product-quest-humor-v1";

const levels: HumorLevel[] = ["minimal", "normal", "maximum"];

export type SettingsStorage = Pick<Storage, "getItem" | "setItem">;

export function loadHumor(storage: SettingsStorage, fallback: HumorLevel): HumorLevel {
  const stored = storage.getItem(humorStorageKey);

  return isHumorLevel(stored) ? stored : fallback;
}

export function saveHumor(storage: SettingsStorage, level: HumorLevel) {
  storage.setItem(humorStorageKey, level);
}

/** The control is one button, so the levels cycle rather than open a menu. */
export function nextHumor(level: HumorLevel): HumorLevel {
  return levels[(levels.indexOf(level) + 1) % levels.length];
}

export function isHumorLevel(value: unknown): value is HumorLevel {
  return typeof value === "string" && (levels as string[]).includes(value);
}
