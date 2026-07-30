import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const chapterURL = new URL("/play/chapter-01", baseURL).toString();
const outputDir = new URL("../.tmp/qa-screens/", import.meta.url);
const settleMs = Number(process.env.QA_SCREEN_SETTLE_MS ?? 700);
const storageKeys = [
  "ai-product-quest-campaign-v1",
  "ai-product-quest-flow-v1",
  "ai-product-quest-mission-v2",
  "ai-product-quest-progress",
];
// The prologue advances on any input; only the last two steps offer choices.
const prologuePath = [
  { advance: true, expect: "Ты пришла раньше, чем я ожидал." },
  { advance: true, expect: "Что создаёт хороший продукт?" },
  { choose: "Я не знаю." },
  { advance: true, expect: "Знаешь, что меня всегда удивляет?" },
  { advance: true, expect: "Поэтому здесь всё устроено" },
  { choose: "Продолжить" },
  { choose: "Искать проблему." },
  { advance: true, expect: "AI Product Quest" },
  // The title card advances itself; pressing a key here would skip mission-handoff.
  { await: "Люди редко ошибаются потому," },
  { advance: true, expect: "Открываю рабочий контур..." },
  { advance: true, expect: "Система подготовила отчёт." },
];
const happyPath = [
  "Продолжить",
  "Она продолжила текст",
  "Посмотреть ближе",
  "Попробовать самой",
  "зоне риска",
  "Показать вход модели",
  "Показать контекст",
  "Прочитать это как система",
  "И всё же был ответ",
  "Так работает продолжение текста",
  "Где ошибка продукта?",
  "Принять решение",
  "Остановить отчёт и пометить как непроверенный",
  "Продолжить",
  "Сохранить открытие",
  "Записать в Codex",
];
const viewports = [
  { isMobile: false, name: "desktop", viewport: { height: 720, width: 1280 } },
  { isMobile: true, name: "mobile", viewport: { height: 844, width: 390 } },
];

await assertServerReady();
await mkdir(outputDir, { recursive: true });

// QA_CHROMIUM_PATH lets a sandbox point at a preinstalled Chromium; unset uses the bundled one.
const browser = await chromium.launch(
  process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {},
);

for (const viewport of viewports) {
  const context = await browser.newContext({
    isMobile: viewport.isMobile,
    reducedMotion: "reduce",
    viewport: viewport.viewport,
  });
  const page = await context.newPage();

  await resetChapter(page);
  await screenshot(page, `chapter-01-prologue-${viewport.name}.png`);

  await completePrologue(page);
  await screenshot(page, `chapter-01-start-${viewport.name}.png`);

  await completeChapter(page);
  await screenshot(page, `chapter-01-final-${viewport.name}.png`);

  if (!viewport.isMobile) {
    await page.keyboard.press("c");
    await page.getByRole("dialog", { name: "Codex" }).waitFor({ state: "visible", timeout: 5_000 });
    await screenshot(page, "chapter-01-codex-desktop.png");
  }

  await context.close();
}

await browser.close();
console.log(`Chapter 01 QA screenshots saved to ${outputDir.pathname}`);

async function assertServerReady() {
  try {
    const response = await fetch(chapterURL, { method: "HEAD" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error(`Cannot reach ${chapterURL}. Start the app with npm run dev first.`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function resetChapter(page) {
  await page.goto(chapterURL, { waitUntil: "networkidle" });
  await page.evaluate((keys) => {
    for (const key of keys) {
      window.localStorage.removeItem(key);
    }
  }, storageKeys);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Подключение...", { exact: true }).waitFor({ state: "visible", timeout: 5_000 });
}

async function completePrologue(page) {
  for (const step of prologuePath) {
    if (step.choose) {
      await choose(page, step.choose);
      continue;
    }

    if (step.advance) {
      await page.waitForTimeout(320);
      await page.keyboard.press("Enter");
    }

    const expected = step.expect ?? step.await;
    await page.getByText(expected, { exact: true }).waitFor({ state: "visible", timeout: 6_000 });
  }
}

async function completeChapter(page) {
  for (const label of happyPath) {
    await choose(page, label);
  }

  await page.getByText("Дело закрыто.", { exact: true }).waitFor({ state: "visible", timeout: 5_000 });
}

async function choose(page, label) {
  const button = page.getByRole("button").filter({ hasText: label }).first();
  await button.waitFor({ state: "visible", timeout: 5_000 });
  await button.click();
  await page.waitForTimeout(140);
}

async function screenshot(page, filename) {
  // Capture the stable state, not the blur/dissolve transition between scenes.
  await page.waitForTimeout(settleMs);
  await page.screenshot({
    fullPage: false,
    path: new URL(filename, outputDir).pathname,
  });
}
