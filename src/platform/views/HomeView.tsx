import Link from "next/link";
import type { PlatformContent } from "@/src/domain/campaign/types";

export function HomeView({ content }: { content: PlatformContent }) {
  const chapter = content.chapterById["chapter-01"];

  return (
    <div className="platform-screen" data-route="home">
      <div className="platform-copy">
        <span className="platform-kicker">ПРОДОЛЖИТЬ КАМПАНИЮ</span>
        <h1>{chapter.title}</h1>
        <p>{chapter.summary}</p>
      </div>
      <div className="platform-actions">
        <Link className="platform-command platform-command-primary" href="/play/chapter-01">
          Запустить дело
        </Link>
        <Link className="platform-command" href="/journey">
          Карта сезона
        </Link>
      </div>
    </div>
  );
}
