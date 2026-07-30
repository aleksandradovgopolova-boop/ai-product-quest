/**
 * Turns a saved playthrough into a product-readable session report.
 *
 * Collect a save from the browser console after an observed playthrough:
 *
 *   copy(localStorage.getItem("ai-product-quest-campaign-v1"))
 *
 * Then paste it into a file and run:
 *
 *   npm run report:session -- ./run-01.json
 *
 * Reads stdin when no path is given, so several runs can be piped in from a script.
 */
import { readFileSync } from "node:fs";
import { projectCampaign } from "../src/engines/projection/projectCampaign";
import { projectSessionReport } from "../src/engines/analytics/projectSessionReport";
import { loadGameContent } from "../src/infrastructure/content/contentLoader";

const path = process.argv[2];
const raw = path ? readFileSync(path, "utf8") : readFileSync(0, "utf8");
const saved = JSON.parse(raw) as { eventLog?: unknown };

if (!Array.isArray(saved.eventLog)) {
  console.error("Save has no eventLog array. Expected the contents of ai-product-quest-campaign-v1.");
  process.exit(1);
}

const content = loadGameContent();
const state = projectCampaign(content, saved.eventLog as Parameters<typeof projectCampaign>[1]);
console.log(JSON.stringify(projectSessionReport(content, state), null, 2));
