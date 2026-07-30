import Link from "next/link";
import type { PlatformContent } from "@/src/domain/campaign/types";

export function JourneyView({ content }: { content: PlatformContent }) {
  const season = content.seasons[0];

  return (
    <div className="platform-screen" data-route="journey">
      <div className="platform-copy">
        <span className="platform-kicker">СЕЗОН 1</span>
        <h1>{season.title}</h1>
        <p>На Sprint 0 платформа содержит только первый вертикальный срез. Остальные главы не добавляются до приёмки архитектуры.</p>
      </div>
      <div className="platform-list" aria-label="Карта глав">
        {season.chapterIds.map((chapterId) => {
          const chapter = content.chapterById[chapterId];

          return (
            <Link className="platform-row platform-row-active" href={`/play/${chapter.id}`} key={chapter.id}>
              <span>{String(chapter.number).padStart(2, "0")}</span>
              <strong>{chapter.title}</strong>
              <em>доступно</em>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
