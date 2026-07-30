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
  assert.equal(chapter.initialSceneId, "zero-boot");
  assert.equal(chapter.scenes.length > 20, true);
  assert.equal(chapter.sceneById["zero-boot"].advanceMode, "any-input");
  assert.equal(chapter.sceneById["zero-boot"].autoNextSceneId, "zero-first-contact");
  assert.equal(chapter.sceneById["zero-product-question"].choices?.length, 3);
  assert.equal(chapter.sceneById["zero-imagine"].choices?.length, 4);
  assert.equal(chapter.sceneById["case-open"].autoNextSceneId, "incident");
  assert.equal(chapter.sceneById["case-open"].presentation, "terminal");
  assert.equal(chapter.sceneById["context-reveal"].evidence?.length, 3);
  assert.equal(chapter.sceneById.decision.hypothesis?.id, "missing-source-trace");
  assert.equal(chapter.sceneById.final.choices?.[0]?.action, "artifacts");
  assert.deepEqual(chapter.codexEntryIds, ["language-model"]);
  assert.deepEqual(chapter.artifactIds, ["assistant-blueprint"]);
});

test("every prologue answer records a variable and every placeholder resolves", () => {
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

  assert.deepEqual([...declared].sort(), ["approach", "belief", "prediction"]);

  for (const scene of chapter.scenes) {
    for (const line of [...scene.lines, ...(scene.prompt ?? [])]) {
      for (const [, name] of line.matchAll(/\{\{(\w+)\}\}/g)) {
        assert.ok(declared.has(name), `${scene.id} references unknown variable ${name}`);
      }
    }
  }

  // Every branch of a question must record the answer, otherwise the recap goes blank.
  for (const sceneId of ["zero-product-question", "zero-imagine"]) {
    for (const choice of chapter.sceneById[sceneId].choices ?? []) {
      assert.ok(choice.setVariables, `${sceneId}/${choice.id} must record an answer`);
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
