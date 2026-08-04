import { expect, test, type Page } from "@playwright/test";

const appStorageKeys = [
  "ai-product-quest-campaign-v1",
  "ai-product-quest-flow-v1",
  "ai-product-quest-mission-v2",
  "ai-product-quest-progress",
];

test("Chapter 01 opens on AXIOM and records the first answer", async ({ page }) => {
  await resetGame(page);
  await completeChapterOne(page);

  await expect(page.getByText("«проблема человека».", { exact: true })).toBeVisible();
  await assertViewportIntegrity(page);

  // The stage rail replaced the case rail; the chapter is about building, not closing a case.
  await expect(page.locator(".system-progress")).toContainText("Создать");
  await expect(page.locator(".system-topbar")).not.toContainText("ДЕЛО");

  await page.goto("/codex");
  await expect(page.getByRole("heading", { name: "Системная память" })).toBeVisible();
  await expect(page.locator('[aria-label="Записи Codex"]')).toContainText("закрыто");
});

test("Chapter 01 supports keyboard selection, confirmation, and back navigation", async ({ page }) => {
  await resetGame(page);

  await advanceAnyInput(page, "С чего начинается хороший продукт?");

  // No answer may be pre-highlighted: a scene must not point at one before the player aims.
  for (const label of ["С сильной идеи", "С новой технологии", "С проблемы человека", "Пока не знаю"]) {
    await expect(choice(page, label)).not.toHaveAttribute("aria-current", "true");
  }

  await page.keyboard.press("ArrowDown");
  await expect(choice(page, "С сильной идеи")).toHaveAttribute("aria-current", "true");

  await page.keyboard.press("ArrowDown");
  await expect(choice(page, "С новой технологии")).toHaveAttribute("aria-current", "true");

  await page.keyboard.press("Enter");
  await expectScene(page, "«новая технология».");

  await page.keyboard.press("Escape");
  await expectScene(page, "С чего начинается хороший продукт?");
});

test("Chapter 01 can be replayed after reset", async ({ page }) => {
  await resetGame(page);
  await completeChapterOne(page);

  await choose(page, "Начать заново");

  await expectScene(page, "creator: not found");
  await expect(page.getByRole("dialog", { name: "Codex" })).toBeHidden();
});

test.describe("mobile viewport", () => {
  test.use({
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });

  test("Chapter 01 stays inside one viewport without critical overlaps", async ({ page }) => {
    await resetGame(page);
    await assertViewportIntegrity(page);

    await completeChapterOne(page);
    await expectScene(page, "«проблема человека».");
    await assertViewportIntegrity(page);
  });
});

async function resetGame(page: Page) {
  await page.goto("/play/chapter-01");
  await page.evaluate((keys) => {
    for (const key of keys) {
      window.localStorage.removeItem(key);
    }
  }, appStorageKeys);
  await page.reload();
  await expectScene(page, "creator: not found");
  // The boot scene is server-rendered, so keyboard input is ignored until React hydrates.
  await page.waitForTimeout(320);
}

async function completeChapterOne(page: Page) {
  await advanceAnyInput(page, "С чего начинается хороший продукт?");
  // Four answers under a line of dialogue is the tallest screen in the stub chapter.
  await assertViewportIntegrity(page);
  await choose(page, "С проблемы человека");
}

async function choose(page: Page, label: string) {
  const button = choice(page, label);
  await expect(button).toBeVisible();
  await button.click();
  await page.waitForTimeout(760);
}

async function advanceAnyInput(page: Page, expectedText: string) {
  await advanceUntil(page, page.getByText(expectedText, { exact: true }));
}

/**
 * Keyboard input is dropped until React hydrates, and a cold first load can take longer
 * than any fixed wait, so press until the scene actually changes.
 */
async function advanceUntil(page: Page, target: ReturnType<Page["locator"]>) {
  await expect(async () => {
    await page.keyboard.press("Enter");
    await expect(target).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await page.waitForTimeout(320);
}

function choice(page: Page, label: string) {
  return page.getByRole("button").filter({ hasText: label }).first();
}

async function expectScene(page: Page, text: string) {
  await expect(page.getByText(text, { exact: true })).toBeVisible();
}

async function assertViewportIntegrity(page: Page) {
  const result = await page.evaluate(() => {
    const selectors = [".system-topbar", ".system-status", ".flow-scene", ".system-progress", ".system-keys", ".zero-sprite"];
    const viewport = {
      height: window.innerHeight,
      width: window.innerWidth,
    };
    const rects = selectors
      .map((selector) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) {
          return undefined;
        }

        const style = window.getComputedStyle(element);
        if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) {
          return undefined;
        }

        const rect = element.getBoundingClientRect();
        return {
          bottom: rect.bottom,
          element,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          selector,
          top: rect.top,
          width: rect.width,
        };
      })
      .filter((rect): rect is NonNullable<typeof rect> => Boolean(rect));

    const outOfViewport = rects
      .filter((rect) => rect.left < -1 || rect.top < -1 || rect.right > viewport.width + 1 || rect.bottom > viewport.height + 1)
      .map((rect) => rect.selector);

    const overlaps: string[] = [];
    for (let index = 0; index < rects.length; index += 1) {
      for (let nextIndex = index + 1; nextIndex < rects.length; nextIndex += 1) {
        const first = rects[index];
        const second = rects[nextIndex];

        // The progress rail sits inside the topbar; a box holding another is not a collision.
        if (first.element.contains(second.element) || second.element.contains(first.element)) {
          continue;
        }

        const horizontal = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left));
        const vertical = Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));

        if (horizontal * vertical > 8) {
          overlaps.push(`${first.selector} overlaps ${second.selector}`);
        }
      }
    }

    return {
      outOfViewport,
      overlaps,
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      viewport,
    };
  });

  expect(result.outOfViewport).toEqual([]);
  expect(result.overlaps).toEqual([]);
  expect(result.scrollWidth).toBeLessThanOrEqual(result.viewport.width + 1);
  expect(result.scrollHeight).toBeLessThanOrEqual(result.viewport.height + 1);
}
