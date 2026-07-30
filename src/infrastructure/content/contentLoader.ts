import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import Ajv, { type ValidateFunction } from "ajv";
import { parse } from "yaml";
import type {
  ArtifactTemplate,
  Chapter,
  CodexEntry,
  PlatformContent,
  Scene,
  Season,
} from "@/src/domain/campaign/types";

type RawPlatform = {
  id: string;
  title: string;
  defaultSeasonId: string;
  defaultChapterId: string;
  defaultRoute: string;
  metricLabels?: Record<string, string>;
};

type RawSeason = {
  id: string;
  title: string;
  subtitle?: string;
  chapters: Array<{
    id: string;
    number: number;
    title: string;
    summary: string;
    status: string;
  }>;
};

type RawScenes = {
  scenes: Scene[];
};

type RawCodex = {
  entries: CodexEntry[];
};

type RawArtifacts = {
  artifacts: ArtifactTemplate[];
};

const repositoryRoot = resolveRepositoryRoot();
const contentRoot = path.join(repositoryRoot, "content");
const schemaRoot = path.join(repositoryRoot, "schemas");
const ajv = canUseCodeGeneration() ? new Ajv({ allErrors: true }) : undefined;
const validators = new Map<string, ValidateFunction>();
const embeddedContent = typeof import.meta.glob === "function"
  ? import.meta.glob("../../../content/**/*.yml", { eager: true, import: "default", query: "?raw" })
  : {};
const embeddedSchemas = typeof import.meta.glob === "function"
  ? import.meta.glob("../../../schemas/*.json", { eager: true, import: "default", query: "?raw" })
  : {};

export function loadGameContent(): PlatformContent {
  const platform = readYaml<RawPlatform>("platform.yml", "platform.schema.json");
  const rawSeason = readYaml<RawSeason>("seasons/season-01.yml", "season.schema.json");
  const chapter = loadChapter(platform.defaultChapterId);
  const codex = readYaml<RawCodex>("codex/entries.yml", "codex.schema.json");
  const artifacts = readYaml<RawArtifacts>("artifacts/templates.yml", "artifact.schema.json");
  const season: Season = {
    id: rawSeason.id,
    title: rawSeason.title,
    chapterIds: rawSeason.chapters.map((item) => item.id),
  };
  const content: PlatformContent = {
    platformId: platform.id,
    title: platform.title,
    defaultCampaignId: `${platform.id}:campaign:v1`,
    metricLabels: platform.metricLabels ?? {},
    seasons: [season],
    chapters: [chapter],
    chapterById: indexById([chapter]),
    codexEntries: codex.entries,
    codexEntryById: indexById(codex.entries),
    artifactTemplates: artifacts.artifacts,
    artifactTemplateById: indexById(artifacts.artifacts),
  };

  assertContentReferences(content, platform, rawSeason);

  return content;
}

export function loadChapter(chapterId: string): Chapter {
  const chapter = readYaml<Omit<Chapter, "scenes" | "sceneById">>(`chapters/${chapterId}/chapter.yml`, "chapter.schema.json");
  const { scenes } = readYaml<RawScenes>(`chapters/${chapterId}/scenes.yml`, "scene.schema.json");
  const sceneById = indexById(scenes);

  if (!sceneById[chapter.initialSceneId]) {
    throw new Error(`Chapter ${chapter.id} points to missing initial scene: ${chapter.initialSceneId}`);
  }

  for (const scene of scenes) {
    for (const choice of scene.choices ?? []) {
      if (choice.nextSceneId && !sceneById[choice.nextSceneId]) {
        throw new Error(`Scene ${scene.id} choice ${choice.id} points to missing scene: ${choice.nextSceneId}`);
      }
    }

    if (scene.autoNextSceneId && !sceneById[scene.autoNextSceneId]) {
      throw new Error(`Scene ${scene.id} auto-advances to missing scene: ${scene.autoNextSceneId}`);
    }

    if (scene.advanceMode === "any-input" && !scene.autoNextSceneId) {
      throw new Error(`Scene ${scene.id} uses any-input advance without autoNextSceneId`);
    }
  }

  return {
    ...chapter,
    scenes,
    sceneById,
  };
}

function readYaml<T>(relativePath: string, schemaName: string): T {
  const document = parse(readEmbeddedOrFile(embeddedContent, `content/${relativePath}`, path.join(contentRoot, relativePath))) as T;
  const validate = getValidator(schemaName);

  if (validate && !validate(document)) {
    const details = ajv?.errorsText(validate.errors, { separator: "\n" }) ?? "schema validation failed";
    throw new Error(`Invalid content ${relativePath}:\n${details}`);
  }

  return document;
}

function getValidator(schemaName: string) {
  if (!ajv) {
    return undefined;
  }

  const existing = validators.get(schemaName);

  if (existing) {
    return existing;
  }

  const schemaPath = path.join(schemaRoot, schemaName);
  const schema = JSON.parse(readEmbeddedOrFile(embeddedSchemas, `schemas/${schemaName}`, schemaPath)) as object;
  const validate = ajv.compile(schema);
  validators.set(schemaName, validate);

  return validate;
}

function indexById<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

function resolveRepositoryRoot() {
  const viteRoot = import.meta.env?.AI_PRODUCT_QUEST_ROOT;
  const candidates = [viteRoot, process.env.AI_PRODUCT_QUEST_ROOT, process.env.INIT_CWD, process.env.PWD, process.cwd()].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, "content/platform.yml")) && existsSync(path.join(candidate, "schemas/platform.schema.json"))) {
      return candidate;
    }
  }

  return process.cwd();
}

function canUseCodeGeneration() {
  try {
    const createFunction = Function;
    createFunction("return true");
    return true;
  } catch {
    return false;
  }
}

function readEmbeddedOrFile(embedded: Record<string, string>, expectedSuffix: string, filePath: string) {
  const normalizedSuffix = expectedSuffix.replaceAll(path.sep, "/");
  const embeddedEntry = Object.entries(embedded).find(([modulePath]) => modulePath.replaceAll(path.sep, "/").endsWith(normalizedSuffix));

  if (embeddedEntry) {
    return embeddedEntry[1];
  }

  return readFileSync(filePath, "utf8");
}

function assertContentReferences(content: PlatformContent, platform: RawPlatform, season: RawSeason) {
  if (!season.chapters.some((chapter) => chapter.id === platform.defaultChapterId)) {
    throw new Error(`Default chapter ${platform.defaultChapterId} is not declared in season ${season.id}`);
  }

  for (const chapterId of season.chapters.map((chapter) => chapter.id)) {
    if (!content.chapterById[chapterId]) {
      throw new Error(`Season ${season.id} points to missing chapter content: ${chapterId}`);
    }
  }

  for (const entryId of content.chapters.flatMap((chapter) => chapter.codexEntryIds)) {
    if (!content.codexEntryById[entryId]) {
      throw new Error(`Chapter points to missing Codex entry: ${entryId}`);
    }
  }

  for (const artifactId of content.chapters.flatMap((chapter) => chapter.artifactIds)) {
    if (!content.artifactTemplateById[artifactId]) {
      throw new Error(`Chapter points to missing artifact template: ${artifactId}`);
    }
  }
}
