import type { Scene } from "@/src/domain/campaign/types";

/**
 * Zero has a body now. The body is not decoration: every state below is read from something
 * the runtime already knows, so the sprite says what the system is doing at that moment.
 * Nothing here is authored in YAML — adding a scene never means picking a pose by hand.
 */
export type ZeroState =
  | "idle"
  | "speaking"
  | "waiting"
  | "thinking"
  | "right"
  | "wrong"
  | "decision"
  | "codex"
  | "closed";

/** Row order in the sheet. The art must be generated in exactly this order. */
export const zeroSpriteSheet = {
  frameWidth: 192,
  frameHeight: 208,
  frames: 6,
  durationMs: 1100,
  states: ["idle", "speaking", "waiting", "thinking", "right", "wrong", "decision", "codex", "closed"] as const,
} satisfies { frameWidth: number; frameHeight: number; frames: number; durationMs: number; states: readonly ZeroState[] };

export function selectZeroState({ scene, isProcessing }: { scene: Scene; isProcessing: boolean }): ZeroState {
  if (isProcessing) {
    return "thinking";
  }

  if (scene.tone === "error") {
    return "wrong";
  }

  if (scene.tone === "codex") {
    return "codex";
  }

  // The decision readout is the only place where a choice is priced in metrics.
  if (scene.showEffects) {
    return "decision";
  }

  if (scene.tone === "success") {
    return "right";
  }

  // A scene whose every choice leaves the chapter is the end of the case, not a question.
  const choices = scene.choices ?? [];
  if (choices.length > 0 && choices.every((choice) => choice.action)) {
    return "closed";
  }

  if (choices.length > 0) {
    return "waiting";
  }

  return "idle";
}

/** How long Zero keeps talking after a scene appears: the reveal of its own lines. */
export function speakingDurationMs({ lineCount, lineDelayMs }: { lineCount: number; lineDelayMs: number }) {
  if (lineCount <= 0) {
    return 0;
  }

  return Math.round(lineCount * lineDelayMs + 420);
}
