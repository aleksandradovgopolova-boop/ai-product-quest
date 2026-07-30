import type { CampaignState, PlatformContent } from "@/src/domain/campaign/types";
import {
  clearCampaignState,
  loadCampaignState,
  saveCampaignState,
  type StorageAdapter,
} from "@/src/infrastructure/save/saveAdapter";

export function loadCampaignProjection(content: PlatformContent, storage: StorageAdapter, occurredAt?: string) {
  return loadCampaignState(content, storage, occurredAt);
}

export function saveCampaignProjection(storage: StorageAdapter, state: CampaignState) {
  saveCampaignState(storage, state);
}

export function clearCampaignProjection(storage: StorageAdapter) {
  clearCampaignState(storage);
}
