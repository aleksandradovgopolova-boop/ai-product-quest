"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { zeroSpriteSheet, type ZeroState } from "@/src/features/chapter-01/zeroState";
import sheet from "./assets/zero-sprite.png";

const sheetUrl = typeof sheet === "string" ? sheet : sheet.src;

/**
 * The sheet is one image: rows are states in `zeroSpriteSheet.states` order, columns are frames.
 * Animation is a stepped background scroll, so a frame change costs no JavaScript and no repaint
 * of anything but this one layer. `prefers-reduced-motion` freezes it on the first frame.
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
  const row = zeroSpriteSheet.states.indexOf(shown);

  return (
    <div
      aria-hidden="true"
      className="zero-sprite"
      data-state={shown}
      style={
        {
          "--zero-frames": zeroSpriteSheet.frames,
          "--zero-rows": zeroSpriteSheet.states.length,
          "--zero-row": row < 0 ? 0 : row,
          "--zero-duration": `${zeroSpriteSheet.durationMs}ms`,
          "--zero-sheet": `url(${sheetUrl})`,
        } as CSSProperties
      }
    />
  );
}
