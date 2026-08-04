import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";
import { loadGameContent } from "../src/infrastructure/content/contentLoader";

test("YAML content loads as the canonical Platform → Season → Chapter → Scene model", () => {
  const content = loadGameContent();
  const chapter = content.chapterById["chapter-01"];

  assert.equal(content.platformId, "ai-product-quest");
  assert.deepEqual(content.chapters.map((item) => item.id), ["chapter-01"]);
  assert.equal(content.seasons[0]?.chapterIds.length, 1);
  assert.equal(chapter.initialSceneId, "boot");
  assert.equal(chapter.sceneById.boot.advanceMode, "any-input");
  assert.equal(chapter.sceneById.boot.autoNextSceneId, "zero-intro");
  assert.equal(chapter.sceneById["belief-question"].choices?.length, 4);
  assert.deepEqual(chapter.stages, ["Войти", "Создать", "Проверить", "Пересобрать", "Запустить"]);
  assert.deepEqual(chapter.codexEntryIds, ["llm-not-product"]);
  assert.deepEqual(chapter.artifactIds, ["assistant-blueprint"]);
  assert.equal(chapter.mechanics.includes("zero-pet"), true);
});

test("the chapter is about building a product, not auditing a report", () => {
  const content = loadGameContent();
  const chapter = content.chapterById["chapter-01"];
  const allText = [
    chapter.title,
    chapter.summary,
    ...chapter.stages,
    ...chapter.scenes.flatMap((scene) => [...scene.lines, ...(scene.prompt ?? []), ...(scene.choices ?? []).map((choice) => choice.label)]),
  ].join("\n");

  // The opening names the world and the character in their canonical form.
  assert.match(allText, /AXIOM/);
  assert.match(allText, /ZERO/);

  for (const forbidden of ["АКСИОМА", "Аксиома", "Ноль", "НОЛЬ", "Дело №", "Непроверенный отчёт", "инцидент", "внешний специалист"]) {
    assert.doesNotMatch(allText, new RegExp(forbidden), `chapter text still mentions ${forbidden}`);
  }

  // The first question the player answers has no better answer to point at.
  const question = chapter.sceneById["belief-question"];
  assert.deepEqual(
    (question.choices ?? []).filter((choice) => choice.tone === "primary"),
    [],
  );
});

test("every recorded answer keeps a variable and every placeholder resolves", () => {
  const content = loadGameContent();
  const chapter = content.chapterById["chapter-01"];
  const declared = new Set<string>(["prediction"]);

  for (const scene of chapter.scenes) {
    for (const choice of scene.choices ?? []) {
      for (const name of Object.keys(choice.setVariables ?? {})) {
        declared.add(name);
      }
    }
  }

  for (const scene of chapter.scenes) {
    for (const line of [...scene.lines, ...(scene.prompt ?? [])]) {
      for (const [, name] of line.matchAll(/\{\{(\w+)\}\}/g)) {
        assert.ok(declared.has(name), `${scene.id} references unknown variable ${name}`);
      }
    }
  }

  for (const choice of chapter.sceneById["belief-question"].choices ?? []) {
    assert.ok(choice.setVariables, `belief-question/${choice.id} must record an answer`);
  }
});

test("a scene that can be answered wrongly must not mark a preferred answer", () => {
  const content = loadGameContent();

  for (const chapter of content.chapters) {
    for (const scene of chapter.scenes) {
      const choices = scene.choices ?? [];

      if (choices.length < 2) {
        continue;
      }

      const marked = choices.filter((choice) => choice.tone === "primary").map((choice) => choice.id);
      const hasWrongAnswer = choices.some((choice) => choice.nextSceneId && chapter.sceneById[choice.nextSceneId]?.tone === "error");
      const routed = choices.filter((choice) => choice.nextSceneId);
      const singleDestination = routed.length === choices.length && new Set(routed.map((choice) => choice.nextSceneId)).size === 1;

      if (hasWrongAnswer || singleDestination) {
        assert.deepEqual(marked, [], `${scene.id} marks an answer in a scene without a better answer`);
      }
    }
  }
});

test("content references are closed and no TypeScript content source remains", async () => {
  const content = loadGameContent();

  for (const chapter of content.chapters) {
    for (const scene of chapter.scenes) {
      for (const choice of scene.choices ?? []) {
        if (choice.nextSceneId) {
          assert.ok(chapter.sceneById[choice.nextSceneId], `${scene.id}/${choice.id}`);
        }
      }
    }
  }

  await assert.rejects(access(new URL("../src/content/journey.ts", import.meta.url)));
  await assert.rejects(access(new URL("../src/content/episodes/seasonOneBlackBox.ts", import.meta.url)));
});
