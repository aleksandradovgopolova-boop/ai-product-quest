import { loadGameContent } from "@/src/infrastructure/content/contentLoader";

export function getGameContent() {
  return loadGameContent();
}
