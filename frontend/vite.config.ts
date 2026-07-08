import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    // Pre-existing gap, unrelated to the Tailwind migration: Vitest's default
    // include glob matches `*.spec.ts` too, so it was also picking up the
    // Playwright specs in e2e/ (which call Playwright's own test.describe(),
    // incompatible with Vitest's runner) and failing those 4 suites on every
    // `npm run test:run`. Excluding e2e/ on top of Vitest's own defaults.
    exclude: [...configDefaults.exclude, "e2e/**"],
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    },
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/main.tsx", "src/**/*.d.ts"],
    },
  },
});
