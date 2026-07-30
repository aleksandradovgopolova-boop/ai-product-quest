"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { advanceToScene, createInitialCampaignState, getSystemMessage, resetCampaign, runChoice } from "@/src/application/chapter-runner/chapterRunner";
import { clearCampaignProjection, loadCampaignProjection, saveCampaignProjection } from "@/src/application/campaign-persistence/campaignPersistence";
import { getChapter } from "@/src/domain/campaign/lookup";
import type { CampaignState, PlatformContent, SceneChoice } from "@/src/domain/campaign/types";
import { useChapterKeyboard } from "@/src/features/chapter-01/keyboard";
import { playInterfaceTone } from "@/src/features/chapter-01/sound";
import { Chapter01View } from "@/src/features/chapter-01/view/Chapter01View";

const bootTime = "2026-01-01T00:00:00.000Z";

export function Chapter01Adapter({ chapterId = "chapter-01", content }: { chapterId?: string; content: PlatformContent }) {
  const router = useRouter();
  const chapter = useMemo(() => getChapter(content, chapterId), [chapterId, content]);
  const [campaign, setCampaign] = useState<CampaignState>(() => createInitialCampaignState(content, chapter.id, bootTime));
  const [hydrated, setHydrated] = useState(false);
  const [codexVisible, setCodexVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [systemMessage, setSystemMessage] = useState<string>();
  const [activeChoice, setActiveChoice] = useState({ index: 0, sceneId: chapter.initialSceneId });
  const processingTimerRef = useRef<number | undefined>(undefined);
  const messageTimerRef = useRef<number | undefined>(undefined);
  const prefersReducedMotion = Boolean(useReducedMotion());
  const shouldReduceMotion = hydrated && prefersReducedMotion;
  const scene = chapter.sceneById[campaign.currentSceneId] ?? chapter.sceneById[chapter.initialSceneId];
  const choices = scene.choices ?? [];
  const activeChoiceIndex = activeChoice.sceneId === campaign.currentSceneId ? Math.min(activeChoice.index, Math.max(choices.length - 1, 0)) : 0;
  const canAdvanceWithAnyInput = scene.advanceMode === "any-input" && Boolean(scene.autoNextSceneId) && !isProcessing;
  const canGoBack = Boolean(findPreviousSceneId(campaign));
  const processingDelay = shouldReduceMotion ? 40 : 680;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCampaign(loadCampaignProjection(content, window.localStorage));
      setHydrated(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [content]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    saveCampaignProjection(window.localStorage, campaign);
  }, [campaign, hydrated]);

  useEffect(() => {
    if (!hydrated || !scene.autoAdvanceMs || !scene.autoNextSceneId) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCampaign((current) => advanceToScene({ content, state: current, sceneId: scene.autoNextSceneId ?? chapter.initialSceneId }));
    }, scene.autoAdvanceMs);

    return () => window.clearTimeout(timer);
  }, [chapter.initialSceneId, content, hydrated, scene.autoAdvanceMs, scene.autoNextSceneId]);

  useEffect(() => {
    return () => {
      if (processingTimerRef.current) {
        window.clearTimeout(processingTimerRef.current);
      }

      if (messageTimerRef.current) {
        window.clearTimeout(messageTimerRef.current);
      }
    };
  }, []);

  const advanceWithAnyInput = useCallback(() => {
    if (!scene.autoNextSceneId || isProcessing) {
      return;
    }

    playInterfaceTone("confirm");
    setCampaign((current) => advanceToScene({ content, state: current, sceneId: scene.autoNextSceneId ?? chapter.initialSceneId }));
  }, [chapter.initialSceneId, content, isProcessing, scene.autoNextSceneId]);

  const showSystemMessage = useCallback(
    (message?: string) => {
      if (!message) {
        return;
      }

      setSystemMessage(message);

      if (messageTimerRef.current) {
        window.clearTimeout(messageTimerRef.current);
      }

      messageTimerRef.current = window.setTimeout(() => {
        setSystemMessage(undefined);
      }, shouldReduceMotion ? 500 : 1300);
    },
    [shouldReduceMotion],
  );

  const openCodex = useCallback(() => {
    if (campaign.unlockedCodexEntryIds.length === 0) {
      return;
    }

    playInterfaceTone("open");
    setCodexVisible((visible) => !visible);
  }, [campaign.unlockedCodexEntryIds.length]);

  const choose = useCallback(
    (choice: SceneChoice) => {
      if (isProcessing) {
        return;
      }

      if (choice.action === "codex") {
        openCodex();
        return;
      }

      if (choice.action === "artifacts") {
        playInterfaceTone("open");
        router.push("/artifacts");
        return;
      }

      if (choice.action === "reset") {
        playInterfaceTone("confirm");
        clearCampaignProjection(window.localStorage);
        setCodexVisible(false);
        setCampaign(resetCampaign(content));
        return;
      }

      playInterfaceTone("confirm");
      showSystemMessage(getSystemMessage(choice, campaign.currentSceneId));
      setIsProcessing(true);

      if (processingTimerRef.current) {
        window.clearTimeout(processingTimerRef.current);
      }

      processingTimerRef.current = window.setTimeout(() => {
        setCampaign((current) => runChoice({ content, state: current, choiceIdOrIndex: choice.id }));
        setIsProcessing(false);
      }, processingDelay);
    },
    [campaign.currentSceneId, content, isProcessing, openCodex, processingDelay, router, showSystemMessage],
  );

  const moveChoice = useCallback(
    (direction: 1 | -1) => {
      playInterfaceTone("move");
      setActiveChoice((current) => {
        const currentIndex = current.sceneId === campaign.currentSceneId ? current.index : 0;
        return {
          sceneId: campaign.currentSceneId,
          index: (currentIndex + direction + choices.length) % choices.length,
        };
      });
    },
    [campaign.currentSceneId, choices.length],
  );

  const goBack = useCallback(() => {
    const previousSceneId = findPreviousSceneId(campaign);

    if (!previousSceneId) {
      return;
    }

    setCampaign((current) => advanceToScene({ content, state: current, sceneId: previousSceneId }));
  }, [campaign, content]);

  useChapterKeyboard({
    activeChoiceIndex,
    canAdvanceWithAnyInput,
    choices,
    codexUnlocked: campaign.unlockedCodexEntryIds.length > 0,
    codexVisible,
    isProcessing,
    onAdvance: advanceWithAnyInput,
    onBack: goBack,
    onChoice: choose,
    onMove: moveChoice,
    onToggleCodex: openCodex,
  });

  return (
    <Chapter01View
      activeChoiceIndex={activeChoiceIndex}
      canGoBack={canGoBack}
      campaign={campaign}
      chapter={chapter}
      codexVisible={codexVisible}
      content={content}
      isProcessing={isProcessing}
      canAdvanceWithAnyInput={canAdvanceWithAnyInput}
      onAdvance={advanceWithAnyInput}
      onChoice={choose}
      onCloseCodex={openCodex}
      onFocusChoice={(index) => setActiveChoice({ index, sceneId: campaign.currentSceneId })}
      shouldReduceMotion={shouldReduceMotion}
      systemMessage={systemMessage}
    />
  );
}

function findPreviousSceneId(campaign: CampaignState) {
  const enteredScenes = campaign.eventLog
    .filter((event) => event.type === "scene.entered" && typeof event.payload.sceneId === "string")
    .map((event) => event.payload.sceneId as string);
  const currentIndex = enteredScenes.length - 1;

  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    if (enteredScenes[index] !== campaign.currentSceneId) {
      return enteredScenes[index];
    }
  }

  return undefined;
}
