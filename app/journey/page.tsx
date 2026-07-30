import { AppShell } from "@/src/platform/AppShell";
import { JourneyView } from "@/src/platform/views/JourneyView";
import { getGameContent } from "@/src/application/content/getGameContent";

export default function JourneyPage() {
  const content = getGameContent();

  return (
    <AppShell activeRoute="/journey" subtitle="КАРТА СЕЗОНА">
      <JourneyView content={content} />
    </AppShell>
  );
}
