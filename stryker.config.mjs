/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: "npm",
  testRunner: "vitest",
  vitest: {
    configFile: "vitest.config.ts",
  },
  reporters: ["html", "clear-text", "progress", "json"],
  htmlReporter: { fileName: "reports/mutation/index.html" },
  jsonReporter: { fileName: "reports/mutation/mutation.json" },
  mutate: [
    "src/lib/utils/pricing.ts",
    "src/lib/utils/validators.ts",
    "src/lib/utils/formatters.ts",
  ],
  ignorePatterns: [
    "node_modules",
    "dist",
    "reports",
    "supabase",
    "tests/e2e",
    ".stryker-tmp",
  ],
  coverageAnalysis: "perTest",
  thresholds: {
    high: 80,
    low: 60,
    break: 60,
  },
  timeoutMS: 60000,
  concurrency: 2,
  tempDirName: ".stryker-tmp",
  cleanTempDir: true,
  disableTypeChecks: "src/**/*.{ts,tsx}",
};

export default config;
