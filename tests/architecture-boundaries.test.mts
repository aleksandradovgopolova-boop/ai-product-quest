import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const sourceRoots = ["app", "src"];
const sourceExtensions = new Set([".ts", ".tsx", ".mts", ".mjs"]);

type SourceFile = {
  absolutePath: string;
  projectPath: string;
  source: string;
  imports: string[];
};

test("architecture boundaries keep UI away from infrastructure", async () => {
  const files = await readSourceFiles();
  const uiFiles = files.filter((file) => isUiFile(file.projectPath));
  const offenders = uiFiles.filter((file) =>
    file.imports.some((specifier) => pointsTo(specifier, "src/infrastructure") || specifier.includes("/content/") && specifier.endsWith(".yml")),
  );

  assert.deepEqual(formatOffenders(offenders), []);
});

test("domain stays pure and browser-agnostic", async () => {
  const files = (await readSourceFiles()).filter((file) => file.projectPath.startsWith("src/domain/"));
  const forbiddenImports = ["src/application", "src/engines", "src/features", "src/infrastructure", "src/platform", "src/components", "app"];
  const forbiddenRuntimeTokens = /\b(window|document|localStorage|sessionStorage|Storage|HTMLElement|React)\b/;
  const offenders = files.filter(
    (file) =>
      file.imports.some((specifier) => forbiddenImports.some((forbidden) => pointsTo(specifier, forbidden))) ||
      forbiddenRuntimeTokens.test(stripTypeOnlyLines(file.source)),
  );

  assert.deepEqual(formatOffenders(offenders), []);
});

test("engines do not import UI, app routes, or infrastructure", async () => {
  const files = (await readSourceFiles()).filter((file) => file.projectPath.startsWith("src/engines/"));
  const forbiddenImports = ["app", "src/components", "src/features", "src/platform", "src/infrastructure"];
  const offenders = files.filter((file) =>
    file.imports.some((specifier) => forbiddenImports.some((forbidden) => pointsTo(specifier, forbidden))),
  );

  assert.deepEqual(formatOffenders(offenders), []);
});

test("content remains data-only YAML outside src", async () => {
  const files = await readContentFiles();
  const offenders = files.filter((file) => {
    const extension = path.extname(file.projectPath);
    return ![".yml", ".yaml"].includes(extension) || /\b(import|export|from\s+["']react["'])\b/.test(file.source);
  });

  assert.deepEqual(formatOffenders(offenders), []);
});

test("source import graph has no local cycles", async () => {
  const files = await readSourceFiles();
  const graph = buildLocalImportGraph(files);
  const cycle = findCycle(graph);

  assert.equal(cycle, undefined);
});

async function readSourceFiles() {
  const files = await Promise.all(sourceRoots.map((sourceRoot) => collectFiles(path.join(root, sourceRoot))));
  const flatFiles = files.flat().filter((filePath) => sourceExtensions.has(path.extname(filePath)));

  return Promise.all(flatFiles.map(readSourceFile));
}

async function readContentFiles() {
  const files = await collectFiles(path.join(root, "content"));
  return Promise.all(files.map(readSourceFile));
}

async function readSourceFile(absolutePath: string): Promise<SourceFile> {
  const source = await readFile(absolutePath, "utf8");
  const projectPath = path.relative(root, absolutePath).replaceAll(path.sep, "/");

  return {
    absolutePath,
    projectPath,
    source,
    imports: extractImports(source),
  };
}

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? collectFiles(entryPath) : [entryPath];
    }),
  );

  return files.flat();
}

function extractImports(source: string) {
  const imports = new Set<string>();
  const patterns = [
    /import\s+(?:type\s+)?(?:[^"']+\s+from\s+)?["']([^"']+)["']/g,
    /export\s+(?:type\s+)?[^"']+\s+from\s+["']([^"']+)["']/g,
    /import\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      if (match[1]) {
        imports.add(match[1]);
      }
    }
  }

  return Array.from(imports);
}

function isUiFile(projectPath: string) {
  return (
    projectPath.startsWith("app/") ||
    projectPath.startsWith("src/components/") ||
    projectPath.startsWith("src/features/") ||
    projectPath.startsWith("src/platform/")
  );
}

function pointsTo(specifier: string, layerPath: string) {
  const normalized = specifier.replace(/^@\//, "").replace(/^\.\.\//, "").replaceAll(path.sep, "/");
  return normalized === layerPath || normalized.startsWith(`${layerPath}/`);
}

function stripTypeOnlyLines(source: string) {
  return source
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("import type"))
    .join("\n");
}

function buildLocalImportGraph(files: SourceFile[]) {
  const byPath = new Map(files.map((file) => [file.projectPath, file]));
  const graph = new Map<string, string[]>();

  for (const file of files) {
    const edges = file.imports
      .map((specifier) => resolveLocalImport(file, specifier, byPath))
      .filter((value): value is string => Boolean(value));
    graph.set(file.projectPath, edges);
  }

  return graph;
}

function resolveLocalImport(file: SourceFile, specifier: string, byPath: Map<string, SourceFile>) {
  if (!specifier.startsWith("@/") && !specifier.startsWith(".")) {
    return undefined;
  }

  const basePath = specifier.startsWith("@/")
    ? specifier.slice(2)
    : path.join(path.dirname(file.projectPath), specifier).replaceAll(path.sep, "/");
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.mts`,
    `${basePath}.mjs`,
    `${basePath}/index.ts`,
    `${basePath}/index.tsx`,
  ];

  return candidates.find((candidate) => byPath.has(candidate));
}

function findCycle(graph: Map<string, string[]>) {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function visit(node: string): string[] | undefined {
    if (visiting.has(node)) {
      return [...stack.slice(stack.indexOf(node)), node];
    }

    if (visited.has(node)) {
      return undefined;
    }

    visiting.add(node);
    stack.push(node);

    for (const next of graph.get(node) ?? []) {
      const cycle = visit(next);
      if (cycle) {
        return cycle;
      }
    }

    stack.pop();
    visiting.delete(node);
    visited.add(node);

    return undefined;
  }

  for (const node of graph.keys()) {
    const cycle = visit(node);
    if (cycle) {
      return cycle.join(" -> ");
    }
  }

  return undefined;
}

function formatOffenders(files: SourceFile[]) {
  return files.map((file) => file.projectPath).sort();
}
