"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { getZeroSpriteState, zeroSpriteSheet, type ZeroState } from "@/src/features/chapter-01/zeroState";
import sheet from "./assets/zero-sprite.png";

const sheetUrl = typeof sheet === "string" ? sheet : sheet.src;

/**
 * The sheet is one image: rows are states, columns are frames, and a state uses only as many
 * columns as its animation needs. Animation is a stepped background scroll, so a frame change
 * costs no JavaScript and no repaint of anything but this one layer. A state with a single
 * frame never animates, and `prefers-reduced-motion` freezes every state on its first frame.
 */
export function ZeroSprite({ speakingMs, state }: { speakingMs: number; state: ZeroState }) {
  // The parent keys this component by scene, so a new scene starts talking from scratch.
  const [isSpeaking, setIsSpeaking] = useState(speakingMs > 0);

  useEffect(() => {
    if (speakingMs <= 0) {
      return;
    }

    const timer = window.setTimeout(() => setIsSpeaking(false), speakingMs);

    return () => window.clearTimeout(timer);
  }, [speakingMs]);

  // Speaking only replaces the quiet states: an error or a verdict must keep its own face.
  const shown: ZeroState = isSpeaking && (state === "idle" || state === "waiting") ? "speaking" : state;
  const sprite = getZeroSpriteState(shown);

  return (
    <div
      aria-hidden="true"
      className="zero-sprite"
      data-state={shown}
      style={
        {
          "--zero-columns": zeroSpriteSheet.columns,
          "--zero-frames": sprite.frames,
          "--zero-rows": zeroSpriteSheet.states.length,
          "--zero-row": sprite.row,
          "--zero-duration": `${sprite.durationMs}ms`,
          "--zero-sheet": `url(${sheetUrl})`,
        } as CSSProperties
      }
    />
  );
}
