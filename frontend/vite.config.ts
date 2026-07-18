import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // In dev, forward /api/* to the backend
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/setup.ts",
    // tests-e2e/ holds Playwright specs (run via `npm run test:e2e`), not
    // Vitest ones. Vitest's default include glob matches *.spec.ts too, so
    // without this exclude `npx vitest run` tries to collect them and fails
    // with "Playwright Test did not expect test.describe() to be called here".
    exclude: ["node_modules/**", "tests-e2e/**"],
    // Permit tests to read the shared FE/BE parity vector that lives in
    // backend/tests/data/. Without this, Vite's fs allowlist blocks any
    // import path that resolves outside the frontend project root.
    server: {
      fs: {
        allow: [".."],
      },
    },
  },
});
