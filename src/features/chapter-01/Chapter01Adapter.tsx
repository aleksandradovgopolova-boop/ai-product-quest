"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { advanceToScene, createInitialCampaignState, getSystemMessage, resetCampaign, runChoice } from "@/src/application/chapter-runner/chapterRunner";
import {
  changeComponent,
  confirmCapability,
  confirmRebuild,
  currentBuildStep,
  recordContextToggle,
  runTests,
} from "@/src/application/chapter-runner/productRunner";
import { clearCampaignProjection, loadCampaignProjection, saveCampaignProjection } from "@/src/application/campaign-persistence/campaignPersistence";
import {
  countBudget,
  getOptions,
  rebuildableComponents,
} from "@/src/engines/product/productBuilder";
import { describeSelection } from "@/src/engines/projection/projectProduct";
import { getChapter } from "@/src/domain/campaign/lookup";
import type { CampaignState, PlatformContent, ProductComponentKind, SceneChoice } from "@/src/domain/campaign/types";
import { useChapterKeyboard } from "@/src/features/chapter-01/keyboard";
import { playInterfaceTone } from "@/src/features/chapter-01/sound";
import { Chapter01View, type ProductPanel } from "@/src/features/chapter-01/view/Chapter01View";

const bootTime = "2026-01-01T00:00:00.000Z";

export function Chapter01Adapter({ chapterId = "chapter-01", content }: { chapterId?: string; content: PlatformContent }) {
  const router = useRouter();
  const chapter = useMemo(() => getChapter(content, chapterId), [chapterId, content]);
  const [campaign, setCampaign] = useState<CampaignState>(() => createInitialCampaignState(content, chapter.id, bootTime));
  const [hydrated, setHydrated] = useState(false);
  const [codexVisible, setCodexVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [systemMessage, setSystemMessage] = useState<string>();
  // -1 means "nothing aimed at yet": a scene must not pre-highlight any answer.
  const [activeChoice, setActiveChoice] = useState({ index: -1, sceneId: chapter.initialSceneId });
  // What the player has ticked but not yet confirmed. Deliberately local: only a confirmation
  // writes to the Event Log, so an abandoned half-selection leaves no trace.
  const [pendingSelection, setPendingSelection] = useState<string[]>([]);
  const [openComponent, setOpenComponent] = useState<ProductComponentKind | undefined>(undefined);
  const processingTimerRef = useRef<number | undefined>(undefined);
  const messageTimerRef = useRef<number | undefined>(undefined);
  const prefersReducedMotion = Boolean(useReducedMotion());
  const shouldReduceMotion = hydrated && prefersReducedMotion;
  const scene = chapter.sceneById[campaign.currentSceneId] ?? chapter.sceneById[chapter.initialSceneId];
  const choices = scene.choices ?? [];
  const activeChoiceIndex = activeChoice.sceneId === campaign.currentSceneId ? Math.min(activeChoice.index, choices.length - 1) : -1;
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
      showSystemMessage(getSystemMessage(choice));
      setIsProcessing(true);

      if (processingTimerRef.current) {
        window.clearTimeout(processingTimerRef.current);
      }

      processingTimerRef.current = window.setTimeout(() => {
        setCampaign((current) => runChoice({ content, state: current, choiceIdOrIndex: choice.id }));
        setIsProcessing(false);
      }, processingDelay);
    },
    [content, isProcessing, openCodex, processingDelay, router, showSystemMessage],
  );

  const moveChoice = useCallback(
    (direction: 1 | -1) => {
      playInterfaceTone("move");
      setActiveChoice((current) => {
        const currentIndex = current.sceneId === campaign.currentSceneId ? current.index : -1;

        // From "nothing aimed at yet", down lands on the first row and up on the last.
        if (currentIndex < 0) {
          return {
            sceneId: campaign.currentSceneId,
            index: direction === 1 ? 0 : choices.length - 1,
          };
        }

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

  const capability = scene.capability;
  const catalogue = chapter.product;
  const buildStep = capability?.kind === "build" ? currentBuildStep(capability, campaign.product.configuration) : undefined;
  // A step is identified by where it sits, so moving on clears what was ticked for the last one.
  const stepKey = `${scene.id}:${buildStep?.step?.target ?? openComponent ?? ""}`;
  const lastStepKeyRef = useRef(stepKey);

  useEffect(() => {
    if (lastStepKeyRef.current !== stepKey) {
      lastStepKeyRef.current = stepKey;
      setPendingSelection([]);
    }
  }, [stepKey]);

  const toggleOption = useCallback(
    (optionId: string, single: boolean, isContext: boolean) => {
      playInterfaceTone("move");
      setPendingSelection((current) => {
        if (single) {
          return [optionId];
        }

        const selected = current.includes(optionId);

        if (isContext) {
          setCampaign((state) => recordContextToggle({ content, state, optionId, selected: !selected }));
        }

        return selected ? current.filter((entry) => entry !== optionId) : [...current, optionId];
      });
    },
    [content],
  );

  const productPanel = useMemo<ProductPanel | undefined>(() => {
    if (!capability || !catalogue) {
      return undefined;
    }

    if (capability.kind === "build" && buildStep?.step) {
      const step = buildStep.step;
      const single = step.select === "one";

      return {
        kind: "build",
        step,
        options: getOptions(catalogue, step.target, campaign.product.configuration),
        selected: pendingSelection,
        spent: step.target === "context" ? countBudget(catalogue, pendingSelection, step.budget).spent : 0,
        onToggle: (optionId) => toggleOption(optionId, single, step.target === "context"),
        onConfirm: () => {
          playInterfaceTone("confirm");
          setCampaign((state) => confirmCapability({ content, state, optionIds: pendingSelection }));
          setPendingSelection([]);
        },
      };
    }

    if (capability.kind === "run-tests" && campaign.product.latestRun) {
      return {
        kind: "tests",
        run: campaign.product.latestRun,
        previous: campaign.product.rebuild.confirmed ? campaign.product.firstRun : undefined,
        confirmLabel: capability.confirmLabel ?? "Дальше",
        onConfirm: () => {
          playInterfaceTone("confirm");
          setCampaign((state) => runTests({ content, state }));
        },
      };
    }

    if (capability.kind === "rebuild") {
      const configuration = campaign.product.configuration;

      return {
        kind: "rebuild",
        components: rebuildableComponents.map((component) => ({
          component,
          current: describeSelection(catalogue, configuration, component),
        })),
        openComponent,
        options: openComponent ? getOptions(catalogue, openComponent, configuration) : [],
        selected: pendingSelection,
        changesUsed: campaign.product.rebuild.changes.length,
        maxChanges: capability.maxChanges ?? 0,
        confirmLabel: capability.confirmLabel ?? "Дальше",
        onOpenComponent: (component) => {
          setOpenComponent(component);
          setPendingSelection([]);
        },
        onToggle: (optionId) => toggleOption(optionId, openComponent === "outcome" || openComponent === "modelRole", false),
        onApply: () => {
          if (!openComponent) {
            return;
          }

          playInterfaceTone("confirm");
          setCampaign((state) => changeComponent({ content, state, component: openComponent, optionIds: pendingSelection }));
          setOpenComponent(undefined);
          setPendingSelection([]);
        },
        onConfirm: () => {
          playInterfaceTone("confirm");
          setCampaign((state) => confirmRebuild({ content, state }));
        },
      };
    }

    return undefined;
  }, [buildStep?.step, campaign.product, capability, catalogue, content, openComponent, pendingSelection, toggleOption]);

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
      productPanel={productPanel}
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
