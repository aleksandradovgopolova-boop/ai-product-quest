import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";

export function SystemFrame() {
  return (
    <div className="system-frame" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

/**
 * `children` is the stage rail. It sits beside what is being built rather than at the foot of
 * the screen: both answer "where in the chapter am I", and split across the viewport they read
 * as two unrelated HUD elements.
 */
export function SystemTopbar({
  chapterShort,
  chapterSummary,
  chapterTitle,
  children,
}: {
  chapterShort: string;
  chapterSummary: string;
  chapterTitle: string;
  children?: ReactNode;
}) {
  return (
    <header className="system-topbar">
      <div className="system-topbar-row">
        <span className="system-brand">AI PRODUCT QUEST</span>
        <span className="system-case-id">
          <span className="system-case-long">{chapterTitle.toUpperCase()}</span>
          <span className="system-case-short">{chapterShort}</span>
        </span>
      </div>
      <div className="system-topbar-lower">
        <div className="system-case-brief">
          <span>ЧТО СОЗДАЁМ</span>
          <strong>{chapterSummary}</strong>
        </div>
        {children}
      </div>
    </header>
  );
}

export function SystemStatus({ value }: { value: string }) {
  return (
    <aside className="system-status" aria-label={`Состояние: ${value}`}>
      <span>СОСТОЯНИЕ</span>
      <strong>{value}</strong>
    </aside>
  );
}

export function SystemMessage({ text }: { text?: string }) {
  return (
    <AnimatePresence>
      {text ? (
        <motion.aside
          animate={{ opacity: 1, y: 0 }}
          className="system-message"
          exit={{ opacity: 0, y: -6 }}
          initial={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
        >
          {text}
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

export function ProcessingBlock() {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="processing-block"
      exit={{ opacity: 0, y: -4 }}
      initial={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2 }}
    >
      <span>ПРОВЕРКА</span>
      <i aria-hidden="true" />
    </motion.div>
  );
}

export function HotkeyHint({
  canGoBack,
  choiceCount,
  codexUnlocked,
}: {
  canGoBack: boolean;
  choiceCount: number;
  codexUnlocked: boolean;
}) {
  return (
    <aside className="system-keys" aria-label="Горячие клавиши">
      {choiceCount > 1 ? <span>↑↓ выбрать решение</span> : null}
      {choiceCount > 0 ? <span>Enter/Space выполнить</span> : null}
      {codexUnlocked ? <span>Tab/C Codex</span> : null}
      {canGoBack ? <span>Esc назад</span> : null}
    </aside>
  );
}
