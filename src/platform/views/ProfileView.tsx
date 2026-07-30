"use client";

import type { PlatformContent } from "@/src/domain/campaign/types";
import { useCampaignProjection } from "@/src/platform/useCampaignProjection";

export function ProfileView({ content }: { content: PlatformContent }) {
  const campaign = useCampaignProjection(content);

  return (
    <div className="platform-screen" data-route="profile">
      <div className="platform-copy">
        <span className="platform-kicker">ПРОФИЛЬ</span>
        <h1>{campaign.engineerProfile.title}</h1>
        <p>Профиль AI Product Engineer строится из событий: решений, открытий Codex и созданных артефактов.</p>
      </div>
      <div className="platform-list" aria-label="Профиль инженера">
        <div className="platform-row">
          <span>XP</span>
          <strong>{campaign.engineerProfile.xp}</strong>
          <em>{campaign.engineerProfile.rank}</em>
        </div>
        <div className="platform-row">
          <span>SKILL</span>
          <strong>{campaign.engineerProfile.skills[0] ?? "Навык ещё не открыт"}</strong>
          <em>{campaign.dashboard.currentStepLabel}</em>
        </div>
        <div className="platform-row">
          <span>CASE</span>
          <strong>{campaign.dashboard.caseTitle}</strong>
          <em>{campaign.dashboard.currentStepIndex} из {campaign.dashboard.totalSteps}</em>
        </div>
      </div>
    </div>
  );
}
