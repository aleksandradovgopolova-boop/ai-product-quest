import { AppShell } from "@/src/platform/AppShell";
import { CodexView } from "@/src/platform/views/CodexView";
import { getGameContent } from "@/src/application/content/getGameContent";

export default function CodexPage() {
  const content = getGameContent();

  return (
    <AppShell activeRoute="/codex" subtitle="СИСТЕМНАЯ ПАМЯТЬ">
      <CodexView content={content} />
    </AppShell>
  );
}
