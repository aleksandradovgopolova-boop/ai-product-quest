import { AppShell } from "@/src/platform/AppShell";
import { HomeView } from "@/src/platform/views/HomeView";
import { getGameContent } from "@/src/application/content/getGameContent";

export default function Home() {
  const content = getGameContent();

  return (
    <AppShell activeRoute="/" subtitle="ГЛАВНАЯ / ПРОДОЛЖИТЬ">
      <HomeView content={content} />
    </AppShell>
  );
}
