import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { CampaignState, Chapter, Evidence, PlatformContent, SceneChoice } from "@/src/domain/campaign/types";
import { interpolateLines } from "@/src/application/chapter-runner/chapterRunner";
import { cn } from "@/src/lib/utils";
import { selectZeroState, speakingDurationMs } from "@/src/features/chapter-01/zeroState";
import { ZeroSprite } from "@/src/features/chapter-01/view/ZeroSprite";
import { StageProgress } from "@/src/features/chapter-01/view/StageProgress";
import { ChoiceList } from "@/src/features/chapter-01/view/ChoiceList";
import { CodexOverlay } from "@/src/features/chapter-01/view/CodexOverlay";
import {
  HotkeyHint,
  ProcessingBlock,
  SystemFrame,
  SystemMessage,
  SystemStatus,
  SystemTopbar,
} from "@/src/features/chapter-01/view/SystemHud";

export function Chapter01View({
  activeChoiceIndex,
  canGoBack,
  campaign,
  canAdvanceWithAnyInput,
  chapter,
  codexVisible,
  content,
  isProcessing,
  onAdvance,
  onChoice,
  onCloseCodex,
  onFocusChoice,
  shouldReduceMotion,
  systemMessage,
}: {
  activeChoiceIndex: number;
  canGoBack: boolean;
  campaign: CampaignState;
  canAdvanceWithAnyInput: boolean;
  chapter: Chapter;
  codexVisible: boolean;
  content: PlatformContent;
  isProcessing: boolean;
  onAdvance: () => void;
  onChoice: (choice: SceneChoice) => void;
  onCloseCodex: () => void;
  onFocusChoice: (index: number) => void;
  shouldReduceMotion: boolean;
  systemMessage?: string;
}) {
  const scene = chapter.sceneById[campaign.currentSceneId];
  const lines = scene ? interpolateLines(scene.lines, campaign.variables) : [];
  const choices = scene?.choices ?? [];
  const status = codexVisible ? "ДОСТУП К ПАМЯТИ" : isProcessing ? "ПРОВЕРКА..." : campaign.system.status;
  const isBare = scene?.chrome === "bare";
  const presentation = scene?.presentation ?? "system";
  const sceneTransition = shouldReduceMotion ? { duration: 0.01 } : { duration: 0.42, ease: "easeOut" as const };
  const lineDelay = shouldReduceMotion ? 0 : 0.08;

  if (!scene) {
    return null;
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className={cn("flow-shell", isBare && "flow-shell-bare")} onPointerUp={canAdvanceWithAnyInput ? onAdvance : undefined}>
        <div className="flow-field" aria-hidden="true" />
        <div className="flow-noise" aria-hidden="true" />
        {!isBare ? <SystemFrame /> : null}
        {!isBare ? (
          <SystemTopbar chapterShort={`ГЛАВА ${String(chapter.number).padStart(2, "0")}`} chapterSummary={chapter.summary} chapterTitle={chapter.title}>
            <StageProgress current={campaign.dashboard.currentStageIndex} stages={chapter.stages} />
          </SystemTopbar>
        ) : null}
        {!isBare ? <SystemStatus value={status} /> : null}
        {!isBare ? <SystemMessage text={systemMessage} /> : null}
        {!isBare ? (
          <ZeroSprite
            key={scene.id}
            speakingMs={speakingDurationMs({ lineCount: lines.length, lineDelayMs: lineDelay * 1000 })}
            state={selectZeroState({ scene, isProcessing })}
          />
        ) : null}

        <AnimatePresence mode="wait">
          <motion.section
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            aria-live="polite"
            className={cn("flow-scene", `flow-scene-${scene.tone ?? "normal"}`, isBare && "flow-scene-bare", `flow-scene-${presentation}`)}
            exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -10, filter: shouldReduceMotion ? "blur(0px)" : "blur(8px)" }}
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10, filter: shouldReduceMotion ? "blur(0px)" : "blur(8px)" }}
            key={campaign.currentSceneId}
            transition={sceneTransition}
          >
            <div className="flow-present">
              {scene.prompt ? <Speaker lines={interpolateLines(scene.prompt, campaign.variables)} shouldReduceMotion={shouldReduceMotion} /> : null}
              {scene.hypothesis ? <HypothesisReadout text={scene.hypothesis.text} /> : null}

              <motion.div animate="show" className="flow-copy" initial="hidden">
                {lines.map((line, index) => (
                  <RevealedLine delay={lineDelay * index} hasCursor={index === lines.length - 1} key={`${line}-${index}`} text={line} />
                ))}
              </motion.div>

              {scene.visual === "context" ? <ContextTrace evidence={scene.evidence ?? []} /> : null}
              {scene.visual === "signal" ? <SystemSignal /> : null}
              {scene.showEffects ? <EffectsReadout campaign={campaign} labels={content.metricLabels} /> : null}
            </div>

            {choices.length > 0 ? (
              <AnimatePresence mode="wait">
                {isProcessing ? (
                  <ProcessingBlock key="processing" />
                ) : (
                  <ChoiceList
                    activeChoiceIndex={activeChoiceIndex}
                    commandLabel={isBare ? "ОТВЕТ" : "РЕШЕНИЕ"}
                    choices={choices}
                    onChoice={onChoice}
                    onFocusChoice={onFocusChoice}
                    shouldReduceMotion={shouldReduceMotion}
                  />
                )}
              </AnimatePresence>
            ) : canAdvanceWithAnyInput && presentation !== "title" ? (
              <AdvanceHint />
            ) : (
              <div className="flow-choices flow-choices-empty" aria-hidden="true" />
            )}
          </motion.section>
        </AnimatePresence>

        {!isBare && campaign.unlockedCodexEntryIds.length > 0 ? (
          <button className="flow-command" onClick={onCloseCodex} type="button">
            TAB / C / CODEX
          </button>
        ) : null}

        {!isBare ? <HotkeyHint canGoBack={canGoBack} choiceCount={choices.length} codexUnlocked={campaign.unlockedCodexEntryIds.length > 0} /> : null}

        <AnimatePresence>
          {codexVisible ? <CodexOverlay content={content} entryIds={campaign.unlockedCodexEntryIds} onClose={onCloseCodex} /> : null}
        </AnimatePresence>
      </main>
    </MotionConfig>
  );
}

function RevealedLine({ delay, hasCursor, text }: { delay: number; hasCursor: boolean; text: string }) {
  return (
    <motion.p
      className="flow-line"
      variants={{
        hidden: { opacity: 0, y: 10, filter: "blur(6px)" },
        show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { delay, duration: 0.36, ease: "easeOut" } },
      }}
    >
      {text}
      {hasCursor ? <span className="line-cursor" aria-hidden="true" /> : null}
    </motion.p>
  );
}

function Speaker({ lines, shouldReduceMotion }: { lines: string[]; shouldReduceMotion: boolean }) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flow-prompt"
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -6 }}
      transition={{ duration: shouldReduceMotion ? 0.01 : 0.28 }}
    >
      {lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </motion.div>
  );
}

function HypothesisReadout({ text }: { text: string }) {
  return (
    <div className="flow-hypothesis">
      <span>РАБОЧАЯ ГИПОТЕЗА</span>
      <strong>{text}</strong>
    </div>
  );
}

function AdvanceHint() {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flow-advance-hint"
      exit={{ opacity: 0, y: -4 }}
      initial={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.24 }}
    >
      <span>нажмите любую клавишу / тапните</span>
    </motion.div>
  );
}

function SystemSignal() {
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className="flow-signal"
      initial={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      aria-hidden="true"
    >
      <i />
    </motion.div>
  );
}

function EffectsReadout({ campaign, labels }: { campaign: CampaignState; labels: Record<string, string> }) {
  const decision = Object.values(campaign.decisions).at(-1);
  const rows = Object.entries(decision?.effects ?? {})
    .filter(([metric, delta]) => delta !== 0 && labels[metric])
    .sort(([, first], [, second]) => Math.abs(second) - Math.abs(first));

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="flow-effects" aria-label="Что изменило решение">
      <span className="effects-title">РЕШЕНИЕ ИЗМЕНИЛО СИСТЕМУ</span>
      <div className="effects-list">
        {rows.map(([metric, delta]) => (
          <span className="effects-row" key={metric}>
            {labels[metric]}
            <strong>{delta > 0 ? `+${delta}` : delta}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function ContextTrace({ evidence }: { evidence: Evidence[] }) {
  return (
    <div className="flow-context" aria-label="Контекст, переданный модели">
      {evidence.map((item, index) => (
        <div className="context-item" key={item.id}>
          {index > 0 ? <div className="context-link" /> : null}
          <div className={cn("context-row", item.missing && "context-row-missing")}>
            <span>{item.title}</span>
            <strong>{item.text}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}
