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
    // tests-e2e/ holds Playwright specs (npm run test:e2e), not Vitest ones —
    // without this, Vitest's default *.spec.ts glob picks them up too and
    // they fail immediately (Playwright's test.describe() isn't valid
    // outside the Playwright runner).
    exclude: ["**/node_modules/**", "**/tests-e2e/**"],
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
