import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
      IMAGES: {
        input() {
          return {
            transform() {
              return {
                output: async () => ({ response: () => new Response("image") }),
              };
            },
          };
        },
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("route contract renders distinct platform surfaces", async () => {
  const routes = ["/", "/journey", "/play/chapter-01", "/codex", "/artifacts", "/profile"];
  const htmlByRoute = new Map();

  for (const route of routes) {
    const response = await render(route);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
    htmlByRoute.set(route, await response.text());
  }

  assert.match(htmlByRoute.get("/") ?? "", /ПРОДОЛЖИТЬ КАМПАНИЮ/);
  assert.match(htmlByRoute.get("/") ?? "", /Запустить дело/);
  assert.doesNotMatch(htmlByRoute.get("/") ?? "", /Система подготовила отчёт/);

  assert.match(htmlByRoute.get("/journey") ?? "", /КАРТА СЕЗОНА/);
  assert.match(htmlByRoute.get("/journey") ?? "", /Дело №01: Непроверенный отчёт/);

  const playInitialMarkup = (htmlByRoute.get("/play/chapter-01") ?? "").split('<script id="_R_">')[0] ?? "";
  assert.match(playInitialMarkup, /Подключение\.\.\./);
  // Boot output belongs to the machine: the speaker label appears only once Zero starts talking.
  assert.doesNotMatch(playInitialMarkup, /flow-prompt/);
  assert.doesNotMatch(playInitialMarkup, /ZERO/);
  assert.doesNotMatch(playInitialMarkup, /Система подготовила отчёт/);
  assert.doesNotMatch(playInitialMarkup, /РЕШЕНИЕ/);
  assert.doesNotMatch(playInitialMarkup, /ОЖИДАЕТ ВЫБОР/);
  assert.match(playInitialMarkup, /нажмите любую клавишу \/ тапните/);
  assert.doesNotMatch(playInitialMarkup, /Enter\/Space выполнить|↑↓ выбрать решение|Esc назад/);

  assert.match(htmlByRoute.get("/codex") ?? "", /Системная память/);
  assert.match(htmlByRoute.get("/artifacts") ?? "", /След решений/);
  assert.match(htmlByRoute.get("/profile") ?? "", /AI Product Engineer/);

  const uniqueBodies = new Set(routes.map((route) => htmlByRoute.get(route)));
  assert.equal(uniqueBodies.size, routes.length);
});

test("legacy routes are outside the accepted route contract", async () => {
  for (const route of ["/episode", "/museum", "/competencies"]) {
    const response = await render(route);
    assert.equal(response.status, 404, route);
  }
});

test("source no longer routes every page through GameMission", async () => {
  const [home, journey, codex, profile, playRoute, view, keyboard, hud, gameCss, packageJson, readme] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/journey/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/codex/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/profile/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/play/[chapterId]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/features/chapter-01/view/Chapter01View.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/features/chapter-01/keyboard.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/features/chapter-01/view/SystemHud.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/styles/game.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(home, /GameMission/);
  assert.doesNotMatch(journey, /GameMission/);
  assert.doesNotMatch(codex, /GameMission/);
  assert.doesNotMatch(profile, /GameMission/);
  assert.match(playRoute, /Chapter01Adapter/);
  assert.doesNotMatch(playRoute, /GameMission|const scenes|type StepId|ai-product-quest-flow-v1/);
  assert.doesNotMatch(view, /chapter\.id ===|currentSceneId === "decision"/);
  assert.match(keyboard, /event\.key\.toLowerCase\(\) === "c"/);
  assert.match(hud, /Esc назад/);
  assert.match(hud, /choiceCount > 1/);
  assert.match(hud, /choiceCount > 0/);
  assert.match(hud, /canGoBack/);
  assert.match(gameCss, /translate: -50% -50%/);
  assert.match(gameCss, /@media \(max-width: 820px\)[\s\S]*overflow: hidden/);
  // The progress rail is part of the topbar, not a second thing pinned to the viewport floor.
  assert.doesNotMatch(gameCss, /\.system-progress\s*\{[^}]*position: fixed/);
  assert.doesNotMatch(gameCss, /\.flow-time/);
  assert.doesNotMatch(hud, /SystemClock/);
  assert.match(gameCss, /@media \(max-width: 520px\)[\s\S]*\.flow-command[\s\S]*display: none/);
  assert.doesNotMatch(gameCss, /\.flow-scene\\s*\\{[^}]*transform: translate\(-50%, -50%\)/s);
  assert.doesNotMatch(packageJson, /"framer-motion"|"lucide-react"|"zustand"/);
  assert.doesNotMatch(readme, /Zustand|Framer Motion|Lucide Icons|src\/content|EpisodeEngine|seasonOneBlackBox/);

  await assert.rejects(access(new URL("app/episode/page.tsx", templateRoot)));
  await assert.rejects(access(new URL("src/components/game/GameMission.tsx", templateRoot)));
});

test("visual stack contract remains explicit", async () => {
  const [design, packageJson] = await Promise.all([
    readFile(new URL("../DESIGN.md", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(design, /one viewport/i);
  assert.match(design, /Motion, imported from `motion\/react`/);
  assert.match(design, /React Bits/);
  assert.match(design, /Claude Directory/);
  assert.match(design, /Open Design/);
  assert.match(design, /If a new element can be removed without losing the player's understanding/i);
  assert.match(packageJson, /"motion":/);
  assert.match(packageJson, /"yaml":/);
  assert.match(packageJson, /"ajv":/);
});
