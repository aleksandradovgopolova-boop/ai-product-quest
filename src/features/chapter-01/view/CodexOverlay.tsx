import { motion } from "motion/react";
import { selectCodexEntries } from "@/src/engines/codex/codexRules";
import type { PlatformContent } from "@/src/domain/campaign/types";
import { cn } from "@/src/lib/utils";

export function CodexOverlay({
  content,
  entryIds,
  onClose,
}: {
  content: PlatformContent;
  entryIds: string[];
  onClose: () => void;
}) {
  const rows = selectCodexEntries(content, entryIds);

  return (
    <motion.aside animate={{ opacity: 1 }} aria-label="Codex" className="codex-layer" exit={{ opacity: 0 }} initial={{ opacity: 0 }} role="dialog">
      <div className="codex-text">
        <div className="codex-head">
          <span>ОТКРЫВАЮ ПАМЯТЬ...</span>
          <strong>CODEX</strong>
        </div>
        <div className="codex-list">
          {rows.map((entry) => (
            <div className={cn("codex-row", entry.unlocked && "codex-row-open")} key={entry.id}>
              <span>{entry.number}</span>
              <strong>{entry.unlocked ? entry.title : "—"}</strong>
              {entry.unlocked ? <p>{entry.body}</p> : null}
            </div>
          ))}
        </div>
      </div>
      <button className="codex-close" onClick={onClose} type="button">
        Закрыть
      </button>
    </motion.aside>
  );
}
