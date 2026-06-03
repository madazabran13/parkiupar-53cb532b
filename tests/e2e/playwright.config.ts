import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 4173);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { outputFolder: "../../reports/playwright/html", open: "never" }],
    ["junit", { outputFile: "../../reports/junit/e2e.junit.xml" }],
  ],
  outputDir: "../../reports/playwright/artifacts",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: `npm run preview -- --port ${PORT} --host 127.0.0.1`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        cwd: "../..",
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
