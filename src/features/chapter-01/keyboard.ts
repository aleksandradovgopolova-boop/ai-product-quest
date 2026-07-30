"use client";

import { useEffect } from "react";
import type { SceneChoice } from "@/src/domain/campaign/types";

export function useChapterKeyboard(params: {
  activeChoiceIndex: number;
  canAdvanceWithAnyInput: boolean;
  choices: SceneChoice[];
  codexUnlocked: boolean;
  codexVisible: boolean;
  isProcessing: boolean;
  onAdvance: () => void;
  onBack: () => void;
  onChoice: (choice: SceneChoice) => void;
  onMove: (direction: 1 | -1) => void;
  onToggleCodex: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (params.codexVisible) {
        if (event.key === "Escape") {
          params.onToggleCodex();
        }
        return;
      }

      if (event.repeat) {
        return;
      }

      if ((event.key === "Tab" || event.key.toLowerCase() === "c") && params.codexUnlocked) {
        event.preventDefault();
        params.onToggleCodex();
        return;
      }

      if (event.key === "Escape" && !params.isProcessing) {
        event.preventDefault();
        params.onBack();
        return;
      }

      if (params.canAdvanceWithAnyInput && !params.isProcessing) {
        event.preventDefault();
        params.onAdvance();
        return;
      }

      if (params.choices.length > 0 && !params.isProcessing && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        params.onMove(event.key === "ArrowDown" ? 1 : -1);
        return;
      }

      if (params.choices.length > 0 && !params.isProcessing && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();

        // Nothing is selected until the player aims, so the first Enter selects instead of
        // submitting. Otherwise a blind Enter would always confirm the top row.
        if (params.activeChoiceIndex < 0) {
          params.onMove(1);
          return;
        }

        params.onChoice(params.choices[params.activeChoiceIndex]);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [params]);
}
