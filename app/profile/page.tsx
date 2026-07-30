import { AppShell } from "@/src/platform/AppShell";
import { ProfileView } from "@/src/platform/views/ProfileView";
import { getGameContent } from "@/src/application/content/getGameContent";

export default function ProfilePage() {
  const content = getGameContent();

  return (
    <AppShell activeRoute="/profile" subtitle="AI PRODUCT ENGINEER">
      <ProfileView content={content} />
    </AppShell>
  );
}
