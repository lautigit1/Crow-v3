import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// ESLint 9 flat config. Reglas de arquitectura FSD (capas app/pages/widgets/
// features/entities/shared, quién puede importar de quién) NO viven acá --
// las cubre Steiger (`npm run lint:fsd`), el linter oficial del equipo de
// Feature-Sliced Design, pensado específicamente para eso. Este archivo se
// ocupa de calidad de código TS/React genérica.
export default tseslint.config(
  { ignores: ["dist", "coverage", "node_modules", "playwright-report", "test-results"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // El repo usa `any` puntualmente en unos pocos límites de integración
      // (respuestas de API sin tipar, mocks de test) -- se deja como warning,
      // no error, para no bloquear CI por deuda preexistente puntual mientras
      // se prioriza el resto del roadmap de la auditoría.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    // Config/setup files corren en Node, no en el browser.
    files: ["vite.config.ts", "vitest.setup.ts", "tailwind.config.js", "postcss.config.js"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["**/*.test.{ts,tsx}", "e2e/**/*.{ts,tsx}", "src/**/__tests__/**"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  }
);
