import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:4173",
    specPattern: "tests/cypress/e2e/**/*.cy.{js,ts}",
    supportFile: "tests/cypress/support/e2e.ts",
    fixturesFolder: "tests/cypress/fixtures",
    downloadsFolder: "reports/cypress/downloads",
    screenshotsFolder: "reports/cypress/screenshots",
    videosFolder: "reports/cypress/videos",
    video: true,
    videoCompression: 32,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 8000,
    requestTimeout: 10000,
    responseTimeout: 15000,
    retries: { runMode: 2, openMode: 0 },
    setupNodeEvents(_on, _config) {
      // place for plugins / event hooks
    },
  },
  reporter: "cypress-multi-reporters",
  reporterOptions: {
    reporterEnabled: "spec, mocha-junit-reporter",
    mochaJunitReporterReporterOptions: {
      mochaFile: "reports/junit/cypress-[hash].junit.xml",
      toConsole: false,
    },
  },
});
