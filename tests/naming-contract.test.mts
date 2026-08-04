import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const scanned = ["content", "src", "app", "schemas"];
const skipped = new Set(["node_modules", ".next", "dist", ".tmp", "legacy", "assets"]);
const scannedExtensions = new Set([".ts", ".tsx", ".mts", ".mjs", ".yml", ".yaml", ".json", ".css"]);

/** Names that must never come back into runtime content, UI copy or schemas. */
const forbidden: Array<[RegExp, string]> = [
  [/АКСИОМ[АЫЕУ]|Аксиома/u, "the world is AXIOM, in latin"],
  [/\bНОЛЬ\b|\bНоль\b/u, "the character is ZERO, in latin"],
  [/Дело №/u, "the chapter is not a case file"],
  [/Непроверенный отчёт/u, "the report story is retired"],
  [/инцидент/iu, "the chapter builds a product, it does not respond to an incident"],
  [/внешний специалист/iu, "the player creates the product, they are not an outside auditor"],
];

test("runtime never speaks in the retired names", async () => {
  const offenders: string[] = [];

  for (const directory of scanned) {
    for (const file of await collectFiles(path.join(root, directory))) {
      const source = await readFile(file, "utf8");

      for (const [pattern, reason] of forbidden) {
        if (pattern.test(source)) {
          offenders.push(`${path.relative(root, file)}: ${reason}`);
        }
      }
    }
  }

  assert.deepEqual(offenders, []);
});

test("the canonical names are spelled the canonical way", async () => {
  const chapter = await readFile(path.join(root, "content/chapters/chapter-01/scenes.yml"), "utf8");

  assert.match(chapter, /AXIOM/);
  assert.match(chapter, /ZERO/);
  // Lowercase or mixed case would drift the moment someone copies a line.
  assert.doesNotMatch(chapter, /\bAxiom\b|\bZero\b/);
});

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (skipped.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
      continue;
    }

    if (scannedExtensions.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}
