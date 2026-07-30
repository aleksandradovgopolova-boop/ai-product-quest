/**
 * Reads a whole cohort of playthroughs against the acceptance table.
 *
 * `report:session` answers what one person did. This answers the only question that
 * decides Chapter 01: does the cohort clear the thresholds in
 * `docs/product/chapter-01-validation.md`.
 *
 *   npm run report:cohort -- ./runs/cohort.json
 *
 * The manifest lists each participant, their role, the chapter version they played, the
 * path to their save, and the observer's scoring of the interview. See
 * `docs/product/cohort-manifest.example.json`.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { projectCampaign } from "../src/engines/projection/projectCampaign";
import { projectSessionReport } from "../src/engines/analytics/projectSessionReport";
import {
  cohortSize,
  projectCohortReport,
  type CohortCriterion,
  type CohortRun,
} from "../src/engines/analytics/projectCohortReport";
import { loadGameContent } from "../src/infrastructure/content/contentLoader";

type ManifestRun = Omit<CohortRun, "report"> & { save: string };

const manifestPath = process.argv[2];

if (!manifestPath) {
  console.error("Usage: npm run report:cohort -- ./runs/cohort.json");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { runs?: ManifestRun[] };

if (!Array.isArray(manifest.runs) || manifest.runs.length === 0) {
  console.error("Manifest has no runs array. See docs/product/cohort-manifest.example.json.");
  process.exit(1);
}

const manifestDir = dirname(resolve(manifestPath));
const content = loadGameContent();

const runs: CohortRun[] = manifest.runs.map((run) => {
  const saved = JSON.parse(readFileSync(resolve(manifestDir, run.save), "utf8")) as { eventLog?: unknown };

  if (!Array.isArray(saved.eventLog)) {
    console.error(`Save for ${run.participant} has no eventLog array: ${run.save}`);
    process.exit(1);
  }

  const state = projectCampaign(content, saved.eventLog as Parameters<typeof projectCampaign>[1]);
  return { ...run, report: projectSessionReport(content, state) };
});

const report = projectCohortReport(runs);

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.accepted ? 0 : 1);
}

console.log(`\nChapter 01 — приёмка по когорте`);
console.log(`Прохождений: ${report.cohortSize} из ${cohortSize}   Версия главы: ${report.chapterVersion ?? "несколько"}\n`);

for (const criterion of report.criteria) {
  console.log(`${mark(criterion)} ${criterion.label.padEnd(58)} ${observed(criterion).padStart(6)}   порог ${describe(criterion)}`);
}

console.log(`\nГлавный gate — transfer-вопрос: ${report.gate.observed} из ${report.cohortSize} → ${band(report.gate.band)}`);

if (report.warnings.length > 0) {
  console.log("");

  for (const warning of report.warnings) {
    console.log(`!  ${warning}`);
  }
}

console.log(`\n${report.accepted ? "ПРИНЯТО: все критерии выполнены." : "НЕ ПРИНЯТО: см. отметки и предупреждения выше."}\n`);
process.exit(report.accepted ? 0 : 1);

function mark(criterion: CohortCriterion) {
  if (criterion.met === undefined) {
    return "?";
  }

  return criterion.met ? "+" : "-";
}

function observed(criterion: CohortCriterion) {
  return Number.isFinite(criterion.observed) ? round(criterion.observed) : "—";
}

function describe(criterion: CohortCriterion) {
  const { threshold } = criterion;

  if (threshold.kind === "min") {
    return `не менее ${threshold.value}`;
  }

  if (threshold.kind === "max") {
    return `не более ${threshold.value}`;
  }

  return `${threshold.min}–${threshold.max}`;
}

function round(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function band(value: string) {
  if (value === "transferable") {
    return "глава учит переносимому принципу";
  }

  if (value === "needs-rework") {
    return "глава перспективная, но требует переработки";
  }

  return value === "example-bound" ? "история работает только внутри собственного примера" : "не определён: нет оценки интервью";
}
