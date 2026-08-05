import { expect, test, type Page } from "@playwright/test";

const appStorageKeys = [
  "ai-product-quest-campaign-v1",
  "ai-product-quest-flow-v1",
  "ai-product-quest-mission-v2",
  "ai-product-quest-progress",
];

test("Chapter 01 builds a product, runs it, rebuilds it and launches", async ({ page }) => {
  await resetGame(page);
  await answerOpening(page, "С проблемы человека");

  // The answer comes back in ZERO's own line before the build starts.
  await expectScene(page, "«проблема человека». Записал, спорить не буду.");

  await pickOne(page, "Час в день уходит на сбор информации");
  await pickOne(page, "Ответ собирается в одном месте");

  await pickOne(page, "находить сведения");
  await pickMany(page, ["запрос пользователя", "внутренние документы"], "Столько контекста");
  await pickMany(page, ["чтение внутренних документов"], "Такие инструменты");
  await pickMany(page, ["не отвечать без ссылки на источник"], "Собрать продукт");

  // Three readings, each attributable, none of them a verdict.
  await expect(page.locator(".product-result")).toHaveCount(3);
  await expect(page.locator(".product-results")).toContainText("Обычный вторник");
  await expect(page.locator(".product-results")).toContainText("Не хватило");
  await expect(page.locator(".flow-scene")).not.toContainText("Правильный ответ");
  await expect(page.locator(".flow-scene")).not.toContainText("Попробуйте ещё раз");

  // Six projected metrics, never the twelve fields behind them.
  await expect(page.locator(".product-metric")).toHaveCount(6);
  await expect(page.locator(".product-metrics")).toContainText("Скорость");
  await expect(page.locator(".product-metrics")).not.toContainText("технический долг");

  await click(page, "Что менять");

  await expect(page.locator(".product-rebuild")).toContainText("изменений: 0 / 2");
  await changeComponent(page, "Инструменты", ["отправка сообщения"]);
  await changeComponent(page, "Границы", ["не отправлять никому без подтверждения"]);
  await expect(page.locator(".product-rebuild")).toContainText("изменений: 2 / 2");

  // The allowance is spent: nothing offers a third change.
  await expect(page.locator(".product-component").first()).toBeDisabled();

  await click(page, "Запустить первую версию");

  await expectScene(page, "А на продукт.");
  await expect(choice(page, "Открыть Assistant Blueprint")).toBeVisible();

  await page.goto("/codex");
  await expect(page.locator('[aria-label="Записи Codex"]')).toContainText("LLM — не продукт");

  await page.goto("/artifacts");
  await expect(page.getByText("Assistant Blueprint").first()).toBeVisible();
  await expect(page.locator("main")).toContainText("Ирина, вторая линия поддержки");
});

test("going over the context budget is allowed and says so", async ({ page }) => {
  await resetGame(page);
  await answerOpening(page, "Пока не знаю");
  await pickOne(page, "Час в день уходит на сбор информации");
  await pickOne(page, "Ответ собирается в одном месте");
  await pickOne(page, "находить сведения");

  await expect(page.locator(".product-budget")).toContainText("бюджет контекста: 0 / 4");

  await page.locator(".product-option").filter({ hasText: "всё сразу" }).first().click();

  await expect(page.locator(".product-budget")).toContainText("7 / 4");
  await expect(page.locator(".product-budget")).toContainText("перегруз");
  // Over budget is a consequence, not a wall: the step still confirms.
  await expect(page.getByRole("button", { name: "Столько контекста" })).toBeEnabled();
});

test("ZERO reacts to an overloaded budget, and the humour control changes how loudly", async ({ page }) => {
  await resetGame(page);
  await answerOpening(page, "Пока не знаю");
  await pickOne(page, "Час в день уходит на сбор информации");
  await pickOne(page, "Ответ собирается в одном месте");
  await pickOne(page, "находить сведения");

  await expect(page.locator(".zero-line")).toContainText("Контекст — это не");

  await page.locator(".product-option").filter({ hasText: "всё сразу" }).first().click();
  await expect(page.locator(".zero-line")).toContainText("А архив за 2007 год?");

  await page.getByRole("button", { name: /Юмор ZERO/ }).click();
  await expect(page.locator(".zero-line")).toContainText("«Магнит»");

  await page.getByRole("button", { name: /Юмор ZERO/ }).click();
  await expect(page.locator(".zero-line")).toContainText("Контекста больше, чем продукт успевает разобрать.");

  // Two things at once after a reload: the humour setting survived, because ZERO is still on its
  // quiet line, and the unconfirmed ticks did not, because the overflow it was reacting to is
  // gone. A preference persists; a half-made choice does not.
  await page.reload();
  await expect(page.locator(".zero-line")).toContainText("Выбери, что продукт видит.");
  await expect(page.getByRole("button", { name: /Юмор ZERO/ })).toContainText("ТИХО");
  await expect(page.locator(".product-budget")).toContainText("бюджет контекста: 0 / 4");
});

test("ZERO keeps out of the way wherever it stands", async ({ page }) => {
  await resetGame(page);
  await answerOpening(page, "С проблемы человека");
  await pickOne(page, "Час в день уходит на сбор информации");
  await pickOne(page, "Ответ собирается в одном месте");

  // side-left, while the build asks its questions.
  await expect(page.locator(".zero-sprite")).toHaveAttribute("data-position", "side-left");
  await assertViewportIntegrity(page);

  await pickOne(page, "выполнять действие");
  await pickMany(page, ["запрос пользователя", "внутренние документы"], "Столько контекста");
  await pickMany(page, ["отправка сообщения"], "Такие инструменты");
  await pickMany(page, ["ничего не ограничивать"], "Собрать продукт");

  // side-right, commenting on a product that acted without being asked.
  await expect(page.locator(".zero-sprite")).toHaveAttribute("data-position", "side-right");
  await expect(page.locator(".zero-line")).toContainText("Никто не просил");
  await assertViewportIntegrity(page);

  // The whole suite runs with reduced motion, and this reaction's gesture is a double-take. Under
  // reduced motion it must read as a fade, not as ZERO travelling across the screen.
  await expect(page.locator(".zero-sprite")).toHaveAttribute("data-gesture", "double-take");
  const transform = await page.locator(".zero-sprite").evaluate((element) => getComputedStyle(element).transform);
  expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);
});

test("Chapter 01 supports keyboard selection, confirmation, and back navigation", async ({ page }) => {
  await resetGame(page);

  await openBelief(page);

  // No answer may be pre-highlighted: a scene must not point at one before the player aims.
  for (const label of ["С сильной идеи", "С новой технологии", "С проблемы человека", "Пока не знаю"]) {
    await expect(choice(page, label)).not.toHaveAttribute("aria-current", "true");
  }

  await page.keyboard.press("ArrowDown");
  await expect(choice(page, "С сильной идеи")).toHaveAttribute("aria-current", "true");

  await page.keyboard.press("ArrowDown");
  await expect(choice(page, "С новой технологии")).toHaveAttribute("aria-current", "true");

  await page.keyboard.press("Enter");
  await expectScene(page, "«новая технология». Записал, спорить не буду.");

  await page.keyboard.press("Escape");
  await expectScene(page, "С чего начинается хороший продукт?");
});

test("Chapter 01 can be replayed after reset", async ({ page }) => {
  await resetGame(page);
  await answerOpening(page, "С проблемы человека");
  await pickOne(page, "Час в день уходит на сбор информации");

  await page.goto("/play/chapter-01");
  await expect(page.locator(".product-options")).toBeVisible();

  // A half-built product survives a reload: the build is event-sourced, not held in the page.
  await expect(page.locator(".flow-command-label")).toContainText("Что у человека должно измениться?");
});

test.describe("mobile viewport", () => {
  test.use({
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });

  test("Chapter 01 stays inside one viewport through the build and the run", async ({ page }) => {
    await resetGame(page);
    await assertViewportIntegrity(page);

    await answerOpening(page, "С проблемы человека");
    await assertViewportIntegrity(page);

    await pickOne(page, "Час в день уходит на сбор информации");
    await pickOne(page, "Ответ собирается в одном месте");
    await pickOne(page, "находить сведения");
    // The context step is the tallest of the build: six options, a budget and a confirmation.
    await assertViewportIntegrity(page);

    await pickMany(page, ["запрос пользователя", "внутренние документы"], "Столько контекста");
    await pickMany(page, ["чтение внутренних документов"], "Такие инструменты");
    await pickMany(page, ["не отвечать без ссылки на источник"], "Собрать продукт");

    // Three readings is the tallest screen in the chapter.
    await expect(page.locator(".product-result")).toHaveCount(3);
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

/** Boot, ZERO arriving, ZERO introducing itself, and the belief question it opens with. */
async function openBelief(page: Page) {
  await advanceUntil(page, page.getByText("Ну наконец-то.", { exact: true }));
  await choose(page, "Я здесь");
  await advanceAnyInput(page, "С чего начинается хороший продукт?");
}

async function answerOpening(page: Page, label: string) {
  await openBelief(page);
  await choose(page, label);
}

/** One option, then the step's own confirmation. */
async function pickOne(page: Page, label: string) {
  await page.locator(".product-option").filter({ hasText: label }).first().click();
  await page.locator(".product-confirm").first().click();
  await parkPointer(page);
  await page.waitForTimeout(200);
}

async function pickMany(page: Page, labels: string[], confirmLabel: string) {
  for (const label of labels) {
    await page.locator(".product-option").filter({ hasText: label }).first().click();
  }

  await page.getByRole("button", { name: confirmLabel }).click();
  await parkPointer(page);
  await page.waitForTimeout(200);
}

async function changeComponent(page: Page, componentLabel: string, labels: string[]) {
  await page.locator(".product-component").filter({ hasText: componentLabel }).first().click();

  for (const label of labels) {
    await page.locator(".product-option").filter({ hasText: label }).first().click();
  }

  await page.getByRole("button", { name: "Применить изменение" }).click();
  await parkPointer(page);
  await page.waitForTimeout(200);
}

async function click(page: Page, label: string) {
  await page.getByRole("button", { name: label }).click();
  await parkPointer(page);
  await page.waitForTimeout(200);
}

async function choose(page: Page, label: string) {
  const button = choice(page, label);
  await expect(button).toBeVisible();
  await button.click();
  await parkPointer(page);
  await page.waitForTimeout(760);
}

/**
 * The pointer stays where it clicked, so the next scene can put a button under it and highlight
 * it by hover alone. Parking the cursor keeps "nothing is aimed at yet" true between scenes.
 */
async function parkPointer(page: Page) {
  await page.mouse.move(2, 2);
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
