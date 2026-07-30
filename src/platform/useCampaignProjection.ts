"use client";

import { useEffect, useState } from "react";
import { loadCampaignProjection } from "@/src/application/campaign-persistence/campaignPersistence";
import { createInitialCampaignState } from "@/src/application/chapter-runner/chapterRunner";
import type { CampaignState, PlatformContent } from "@/src/domain/campaign/types";

const bootTime = "2026-01-01T00:00:00.000Z";

export function useCampaignProjection(content: PlatformContent) {
  const [campaign, setCampaign] = useState<CampaignState>(() => createInitialCampaignState(content, "chapter-01", bootTime));

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCampaign(loadCampaignProjection(content, window.localStorage));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [content]);

  return campaign;
}
