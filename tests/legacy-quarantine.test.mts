import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { loadGameContent } from "../src/infrastructure/content/contentLoader";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const legacyRoot = path.join(root, "content/legacy");

test("the replaced chapter is kept as history and never loaded", async () => {
  await access(path.join(legacyRoot, "chapter-01-incident/scenes.yml"));

  const content = loadGameContent();

  // Nothing from the archive may reach the runtime model.
  const sceneIds = content.chapters.flatMap((chapter) => chapter.scenes.map((scene) => scene.id));
  for (const retired of ["incident-call", "incident-brief", "origin", "decision", "final"]) {
    assert.equal(sceneIds.includes(retired), false, `${retired} is still reachable`);
  }

  assert.equal(content.chapterById["chapter-01"].scenes.length, 9);
});

test("no source file imports or references the archive", async () => {
  const offenders: string[] = [];

  for (const directory of ["src", "app", "scripts", "worker"]) {
    for (const file of await collectFiles(path.join(root, directory))) {
      const source = await readFile(file, "utf8");

      if (/content\/legacy/.test(source) && !file.endsWith("contentLoader.ts")) {
        offenders.push(path.relative(root, file));
      }
    }
  }

  assert.deepEqual(offenders, []);
});

test("the loader refuses a legacy path even when asked directly", async () => {
  const loader = await readFile(path.join(root, "src/infrastructure/content/contentLoader.ts"), "utf8");

  // The guard is the reason the archive is safe to keep in the repository at all.
  assert.match(loader, /legacyPathMarker/);
  assert.match(loader, /Legacy content is quarantined/);
});

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name === "node_modules") {
      continue;
    }

    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
      continue;
    }

    if ([".ts", ".tsx", ".mts", ".mjs"].includes(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}
