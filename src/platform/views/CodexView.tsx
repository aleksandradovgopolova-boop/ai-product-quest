"use client";

import type { PlatformContent } from "@/src/domain/campaign/types";
import { selectCodexEntries } from "@/src/engines/codex/codexRules";
import { useCampaignProjection } from "@/src/platform/useCampaignProjection";

export function CodexView({ content }: { content: PlatformContent }) {
  const campaign = useCampaignProjection(content);
  const entries = selectCodexEntries(content, campaign.unlockedCodexEntryIds);

  return (
    <div className="platform-screen" data-route="codex">
      <div className="platform-copy">
        <span className="platform-kicker">CODEX</span>
        <h1>Системная память</h1>
        <p>Открытые понятия появляются как след прохождения дела, а не как отдельная библиотека курса.</p>
      </div>
      <div className="platform-list" aria-label="Записи Codex">
        {entries.map((entry) => (
          <div className="platform-row" key={entry.id}>
            <span>{entry.number}</span>
            <strong>{entry.unlocked ? entry.title : "—"}</strong>
            <em>{entry.unlocked ? entry.body : "закрыто"}</em>
          </div>
        ))}
      </div>
    </div>
  );
}
