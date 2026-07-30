import { AppShell } from "@/src/platform/AppShell";
import { ArtifactsView } from "@/src/platform/views/ArtifactsView";
import { getGameContent } from "@/src/application/content/getGameContent";

export default function ArtifactsPage() {
  const content = getGameContent();

  return (
    <AppShell activeRoute="/artifacts" subtitle="ИНЖЕНЕРНЫЕ АРТЕФАКТЫ">
      <ArtifactsView content={content} />
    </AppShell>
  );
}
