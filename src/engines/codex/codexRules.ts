import type { CodexEntry, PlatformContent } from "@/src/domain/campaign/types";

export function selectCodexEntries(content: PlatformContent, unlockedEntryIds: string[]): Array<CodexEntry & { unlocked: boolean }> {
  const unlocked = new Set(unlockedEntryIds);

  return content.codexEntries.map((entry) => ({
    ...entry,
    unlocked: unlocked.has(entry.id),
  }));
}
