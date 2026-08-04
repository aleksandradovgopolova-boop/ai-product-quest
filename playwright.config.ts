import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  expect: {
    timeout: 5_000,
  },
  reporter: [["list"]],
  testDir: "./tests/e2e",
  // A full playthrough walks the opening plus the whole case, so it needs more than 30s.
  timeout: 60_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    contextOptions: {
      reducedMotion: "reduce",
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    url: baseURL,
  },
});
