import type { Scene } from "@/src/domain/campaign/types";

/**
 * ZERO has a body. The body is not decoration: every state below is read from something the
 * runtime already knows, so the sprite says what the system is doing at that moment. Nothing
 * here is authored in YAML — adding a scene never means picking a pose by hand.
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

export type ZeroSpriteState = {
  id: ZeroState;
  row: number;
  /** Frames used in this row. The grid is 8 wide; a shorter state leaves its tail empty. */
  frames: number;
  durationMs: number;
};

/**
 * The sheet is an 8-column grid, the same geometry the Petdex atlases use, so a sheet drawn
 * for one can be read by the other. Rows are states in the order below. Frame count and loop
 * length belong to the state, not to the sheet: a shrug does not need the frames a walk does.
 */
export const zeroSpriteSheet = {
  columns: 8,
  frameWidth: 192,
  frameHeight: 208,
  states: [
    { id: "idle", row: 0, frames: 6, durationMs: 1100 },
    { id: "speaking", row: 1, frames: 6, durationMs: 900 },
    { id: "waiting", row: 2, frames: 6, durationMs: 1010 },
    { id: "thinking", row: 3, frames: 8, durationMs: 1030 },
    { id: "right", row: 4, frames: 5, durationMs: 840 },
    { id: "wrong", row: 5, frames: 8, durationMs: 1220 },
    { id: "decision", row: 6, frames: 6, durationMs: 1180 },
    { id: "codex", row: 7, frames: 6, durationMs: 1010 },
    { id: "closed", row: 8, frames: 1, durationMs: 0 },
  ] as const satisfies readonly ZeroSpriteState[],
} as const;

export const zeroSheetWidth = zeroSpriteSheet.columns * zeroSpriteSheet.frameWidth;
export const zeroSheetHeight = zeroSpriteSheet.states.length * zeroSpriteSheet.frameHeight;

export function getZeroSpriteState(state: ZeroState): ZeroSpriteState {
  return zeroSpriteSheet.states.find((item) => item.id === state) ?? zeroSpriteSheet.states[0];
}

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

  // A scene whose every choice leaves the chapter is the end, not a question — and an ending
  // outranks its own tone: the closing scene is warm, but ZERO holds still for it.
  const choices = scene.choices ?? [];
  if (choices.length > 0 && choices.every((choice) => choice.action)) {
    return "closed";
  }

  if (scene.tone === "success") {
    return "right";
  }

  if (choices.length > 0) {
    return "waiting";
  }

  return "idle";
}

/** How long ZERO keeps talking after a scene appears: the reveal of its own lines. */
export function speakingDurationMs({ lineCount, lineDelayMs }: { lineCount: number; lineDelayMs: number }) {
  if (lineCount <= 0) {
    return 0;
  }

  return Math.round(lineCount * lineDelayMs + 420);
}
