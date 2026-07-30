import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { parse } from "yaml";
import { createEvent, createInitialCampaignState, resetCampaign } from "../src/application/chapter-runner/chapterRunner";
import { loadGameContent } from "../src/infrastructure/content/contentLoader";
import { projectCampaign } from "../src/engines/projection/projectCampaign";

const root = path.resolve(new URL("..", import.meta.url).pathname);

test("AI Ops project overlay contains the project context required by repo onboarding", async () => {
  const requiredFiles = [
    ".ai/project/RepositoryProfile.yaml",
    ".ai/project/context/now.md",
    ".ai/project/context/product/ProductOverview.md",
    ".ai/project/context/product/ProductStatus.md",
    ".ai/project/context/product/DesignSystem.md",
    ".ai/project/context/product/MetricCatalog.md",
    ".ai/project/context/system/SystemOverview.md",
    ".ai/project/context/system/RepositoryMap.md",
    ".ai/project/context/system/DataMap.md",
    ".ai/project/context/system/IntegrationMap.md",
    ".ai/project/context/team/DevelopmentProcess.md",
    ".ai/project/context/team/Glossary.md",
    ".ai/project/context/team/OwnershipMap.md",
    ".ai/project/quality-gates.yaml",
    ".ai/project/contracts/events.yaml",
  ];

  for (const file of requiredFiles) {
    const source = await readProjectFile(file);
    assert.match(source, /\S/, file);
  }

  const profile = parse(await readProjectFile(".ai/project/RepositoryProfile.yaml")) as { status?: string; stacks?: Array<{ commands?: Record<string, string> }> };
  assert.equal(profile.status, "confirmed");
  assert.equal(profile.stacks?.[0]?.commands?.test, "npm run test");
});

test("AI Ops event catalog covers campaign domain events and reset emits the canonical past-tense event", async () => {
  const catalog = parse(await readProjectFile(".ai/project/contracts/events.yaml")) as { events?: Array<{ name?: string }> };
  const eventNames = new Set((catalog.events ?? []).map((event) => event.name));

  for (const eventName of [
    "campaign.started",
    "chapter.started",
    "scene.entered",
    "choice.submitted",
    "decision.submitted",
    "codex.entry_unlocked",
    "artifact.generated",
    "legacy.save_migrated",
    "campaign.reset_completed",
    "campaign.reset",
  ]) {
    assert.equal(eventNames.has(eventName), true, eventName);
  }

  const content = loadGameContent();
  const reset = resetCampaign(content, "2026-07-29T12:00:00.000Z");

  assert.equal(reset.eventLog.at(-1)?.type, "campaign.reset_completed");
  assert.equal(reset.eventLog.some((event) => event.type === "campaign.reset"), false);
});

test("legacy campaign.reset events remain projectable for existing local saves", () => {
  const content = loadGameContent();
  const initial = createInitialCampaignState(content, "chapter-01", "2026-07-29T12:10:00.000Z");
  const projected = projectCampaign(content, [
    ...initial.eventLog,
    createEvent(initial.campaignId, initial.eventLog.length + 1, "campaign.reset", "2026-07-29T12:10:00.000Z", {
      campaignId: initial.campaignId,
    }),
  ]);

  assert.equal(projected.currentChapterId, "chapter-01");
  assert.equal(projected.currentSceneId, "zero-boot");
  assert.equal(projected.system.lastMessage, "Кампания сброшена");
});

async function readProjectFile(projectPath: string) {
  return readFile(path.join(root, projectPath), "utf8");
}
