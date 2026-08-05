"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { motion, type Target, type TargetAndTransition } from "motion/react";
import { cn } from "@/src/lib/utils";
import { getZeroSpriteState, zeroSpriteSheet } from "@/src/features/chapter-01/zeroState";
import type { ZeroGesture, ZeroPosition, ZeroState } from "@/src/domain/campaign/types";
import sheet from "./assets/zero-sprite.png";

const sheetUrl = typeof sheet === "string" ? sheet : sheet.src;

/**
 * The other half of ZERO's vocabulary. Nine drawings cannot carry nineteen moods, so expression
 * comes from how a drawing moves: `wrong` recoiling reads as a facepalm, `idle` leaning in reads
 * as someone settling in to watch. Every gesture returns to rest, so none of them accumulates.
 */
const gestures: Record<ZeroGesture, TargetAndTransition> = {
  still: {},
  "lean-in": { x: [0, 5, 3], transition: { duration: 0.9, ease: "easeOut" } },
  recoil: { x: [0, -11, 0], rotate: [0, -5, 0], transition: { duration: 0.7, ease: "easeOut" } },
  nod: { y: [0, 5, 0], transition: { duration: 0.7, repeat: 1, ease: "easeInOut" } },
  shake: { rotate: [0, -4, 4, -2, 0], transition: { duration: 0.8, ease: "easeInOut" } },
  "double-take": { x: [0, -7, 9, 0], transition: { duration: 0.9, ease: "easeInOut" } },
  bounce: { y: [0, -9, 0], transition: { duration: 0.7, repeat: 1, ease: "easeOut" } },
  drift: { y: [0, -5, 0], transition: { duration: 5.2, repeat: Infinity, ease: "easeInOut" } },
  slump: { y: [0, 5], rotate: [0, 3], transition: { duration: 0.9, ease: "easeOut" } },
};

/**
 * The sheet is one image: rows are states, columns are frames, and a state uses only as many
 * columns as its animation needs. Animation is a stepped background scroll, so a frame change
 * costs no JavaScript and no repaint of anything but this one layer. A state with a single
 * frame never animates, and `prefers-reduced-motion` freezes every state on its first frame.
 */
export function ZeroSprite({
  gesture,
  line,
  position,
  shouldReduceMotion,
  speakingMs,
  state,
}: {
  gesture: ZeroGesture;
  line?: string;
  position: ZeroPosition;
  shouldReduceMotion: boolean;
  speakingMs: number;
  state: ZeroState;
}) {
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
  // Reduced motion keeps ZERO expressive without moving it: the gesture becomes a fade, and a
  // change of position is a swap rather than a journey across the screen.
  const animate: Target | TargetAndTransition = shouldReduceMotion
    ? { opacity: [0.6, 0.95], transition: { duration: 0.2 } }
    : gestures[gesture];

  return (
    <motion.aside
      animate={animate}
      aria-live="polite"
      className={cn("zero-sprite", `zero-sprite-${position}`)}
      data-gesture={gesture}
      data-position={position}
      data-state={shown}
      key={`${position}:${gesture}:${shown}`}
    >
      {line ? <p className="zero-line">{line}</p> : null}
      <span
        aria-hidden="true"
        className="zero-sprite-body"
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
    </motion.aside>
  );
}
