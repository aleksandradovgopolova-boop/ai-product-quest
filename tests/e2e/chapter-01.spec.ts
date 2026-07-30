import { expect, test, type Page } from "@playwright/test";

const appStorageKeys = [
  "ai-product-quest-campaign-v1",
  "ai-product-quest-flow-v1",
  "ai-product-quest-mission-v2",
  "ai-product-quest-progress",
];

test("Chapter 01 happy path persists Codex and artifacts across platform routes", async ({ page }) => {
  await resetGame(page);
  await completeChapterOne(page);

  await expect(page.getByText("Дело закрыто.", { exact: true })).toBeVisible();

  await page.keyboard.press("c");
  await expect(page.getByRole("dialog", { name: "Codex" })).toBeVisible();
  await expect(page.getByText("ОТКРЫВАЮ ПАМЯТЬ...")).toBeVisible();
  await expect(page.getByText("Языковая модель", { exact: true })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Codex" })).toBeHidden();

  await choose(page, "Открыть артефакт");
  await expect(page).toHaveURL(/\/artifacts$/);
  await expect(page.getByRole("heading", { name: "След решений" })).toBeVisible();
  await expect(page.locator('[aria-label="Артефакты"]')).toContainText("Assistant Blueprint");
  await expect(page.locator('[aria-label="Артефакты"]')).toContainText("Трассировка источников требуется как часть продукта.");
  await expect(page.locator('[aria-label="Артефакты"]')).toContainText("Остановить отчёт и пометить как непроверенный");

  await page.goto("/codex");
  await expect(page.getByRole("heading", { name: "Системная память" })).toBeVisible();
  await expect(page.locator('[aria-label="Записи Codex"]')).toContainText("Языковая модель");
  await expect(page.locator('[aria-label="Записи Codex"]')).toContainText("Предсказывает продолжение.");
});

test("Chapter 01 supports keyboard selection, confirmation, and back navigation", async ({ page }) => {
  await resetGame(page);

  await page.keyboard.press("Enter");
  await expectScene(page, "Не волнуйся.");
  await page.waitForTimeout(320);

  await page.keyboard.press("Enter");
  await expectScene(page, "Что создаёт хороший продукт?");

  await page.keyboard.press("ArrowDown");
  await expect(choice(page, "Хорошая команда.")).toHaveAttribute("aria-current", "true");

  await page.keyboard.press("ArrowDown");
  await expect(choice(page, "Я не знаю.")).toHaveAttribute("aria-current", "true");

  await page.keyboard.press("Enter");
  await expectScene(page, "Интересно.");

  await page.keyboard.press("Escape");
  await expectScene(page, "Что создаёт хороший продукт?");
});

test("Chapter 01 can be replayed after reset", async ({ page }) => {
  await resetGame(page);
  await completeChapterOne(page);

  await choose(page, "Начать заново");

  await expectScene(page, "Подключение...");
  await expect(page.getByRole("dialog", { name: "Codex" })).toBeHidden();

  await page.goto("/codex");
  await expect(page.getByText("закрыто").first()).toBeVisible();
  await expect(page.locator('[aria-label="Записи Codex"]')).not.toContainText("Языковая модель");
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
    await expectScene(page, "Дело закрыто.");
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
  await expectScene(page, "Подключение...");
}

async function completeChapterOne(page: Page) {
  await advanceAnyInput(page, "Не волнуйся.");
  await advanceAnyInput(page, "Что создаёт хороший продукт?");
  await choose(page, "Я не знаю.");
  await advanceAnyInput(page, "Знаешь, что меня всегда удивляет?");
  await advanceAnyInput(page, "Поэтому здесь всё устроено");
  await choose(page, "Продолжить");
  await choose(page, "Искать проблему.");
  await expectScene(page, "Хорошо.");
  await page.waitForTimeout(320);
  await advanceToTitle(page);
  await advanceAnyInput(page, "Люди редко ошибаются потому,");
  await advanceAnyInput(page, "Система подготовила отчёт.");
  await choose(page, "Продолжить");
  await choose(page, "Она продолжила текст");
  await choose(page, "Посмотреть ближе");
  await choose(page, "Попробовать самой");
  await choose(page, "зоне риска");
  await choose(page, "Показать вход модели");
  await choose(page, "Показать контекст");
  await choose(page, "Прочитать это как система");
  await choose(page, "И всё же был ответ");
  await choose(page, "Так работает продолжение текста");
  await choose(page, "Где ошибка продукта?");
  await choose(page, "Принять решение");
  await choose(page, "Остановить отчёт и пометить как непроверенный");
  await choose(page, "Продолжить");
  await choose(page, "Сохранить открытие");
  await choose(page, "Записать в Codex");
  await expectScene(page, "Дело закрыто.");
}

async function choose(page: Page, label: string) {
  const button = choice(page, label);
  await expect(button).toBeVisible();
  await button.click();
  await page.waitForTimeout(760);
}

async function advanceAnyInput(page: Page, expectedText: string) {
  await page.waitForTimeout(320);
  await page.keyboard.press("Enter");
  await expectScene(page, expectedText);
  await page.waitForTimeout(320);
}

async function advanceToTitle(page: Page) {
  await page.waitForTimeout(320);
  await page.keyboard.press("Enter");
  await expect(page.locator(".flow-scene-title")).toContainText("Видеть");
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
    const selectors = [".system-topbar", ".system-status", ".flow-scene", ".system-progress", ".system-keys"];
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
