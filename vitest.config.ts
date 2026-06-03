import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", "tests/e2e/**", "**/*.config.*"],
    reporters: ["default", ["junit", { outputFile: "reports/junit/front.junit.xml" }]],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "reports/coverage/front",
      include: [
        "src/lib/utils/**/*.ts",
        "src/lib/api.ts",
        "src/services/**/*.ts",
        "src/components/**/*.{ts,tsx}",
      ],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/**/__tests__/**",
        "src/test/**",
        "src/components/ui/**",
        "src/**/*.d.ts",
        "src/lib/utils/pdfGenerators.ts",
      ],
      thresholds: {
        // Baseline inicial; subir conforme se añaden más tests en los niveles 2 y 3.
        "src/lib/utils/pricing.ts": { lines: 90, statements: 90, functions: 100, branches: 80 },
        "src/lib/utils/validators.ts": { lines: 100, statements: 100, functions: 100, branches: 100 },
        "src/lib/utils/formatters.ts": { lines: 80, statements: 80, functions: 80, branches: 70 },
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
