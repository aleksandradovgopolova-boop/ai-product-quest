import type { Chapter, PlatformContent, Scene, SceneChoice } from "@/src/domain/campaign/types";

export function getChapter(content: PlatformContent, chapterId: string): Chapter {
  const chapter = content.chapterById[chapterId];

  if (!chapter) {
    throw new Error(`Unknown chapter: ${chapterId}`);
  }

  return chapter;
}

export function getScene(chapter: Chapter, sceneId: string): Scene {
  const scene = chapter.sceneById[sceneId];

  if (!scene) {
    throw new Error(`Unknown scene: ${chapter.id}/${sceneId}`);
  }

  return scene;
}

export function getChoice(scene: Scene, choiceIdOrIndex: string | number): SceneChoice {
  const choices = scene.choices ?? [];
  const choice = typeof choiceIdOrIndex === "number" ? choices[choiceIdOrIndex] : choices.find((item) => item.id === choiceIdOrIndex);

  if (!choice) {
    throw new Error(`Unknown choice in scene ${scene.id}: ${String(choiceIdOrIndex)}`);
  }

  return choice;
}
