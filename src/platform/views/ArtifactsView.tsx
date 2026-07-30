"use client";

import type { PlatformContent } from "@/src/domain/campaign/types";
import { useCampaignProjection } from "@/src/platform/useCampaignProjection";

export function ArtifactsView({ content }: { content: PlatformContent }) {
  const campaign = useCampaignProjection(content);

  return (
    <div className="platform-screen" data-route="artifacts">
      <div className="platform-copy">
        <span className="platform-kicker">АРХИВ ДЕЛА</span>
        <h1>След решений</h1>
        <p>Артефакты строятся проекцией Event Log и появляются только после действий внутри дела.</p>
      </div>
      <div className="platform-list" aria-label="Артефакты">
        {campaign.artifacts.length > 0 ? (
          campaign.artifacts.map((artifact) => (
            <article className="platform-row platform-row-block" key={artifact.id}>
              <span>{artifact.templateId}</span>
              <strong>{artifact.title}</strong>
              <pre>{artifact.body}</pre>
            </article>
          ))
        ) : (
          <div className="platform-row">
            <span>00</span>
            <strong>Артефактов пока нет</strong>
            <em>закрой первое дело, чтобы система собрала документ</em>
          </div>
        )}
      </div>
    </div>
  );
}
