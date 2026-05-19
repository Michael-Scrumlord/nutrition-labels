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
