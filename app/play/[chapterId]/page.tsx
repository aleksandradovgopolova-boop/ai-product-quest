import { notFound } from "next/navigation";
import { Chapter01Adapter } from "@/src/features/chapter-01/Chapter01Adapter";
import { getGameContent } from "@/src/application/content/getGameContent";

export default async function PlayChapterPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;
  const content = getGameContent();

  if (chapterId !== "chapter-01") {
    notFound();
  }

  return <Chapter01Adapter chapterId={chapterId} content={content} />;
}
