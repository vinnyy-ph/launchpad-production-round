/// <reference types="vitest/config" />
import path from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  // tsconfig.json sets jsx:preserve for Next.js. Vite 8 (bundled with Vitest 4)
  // reads that setting via oxc and would leave JSX untransformed in test files.
  // Setting jsx here overrides the tsconfig value for the Vitest pipeline.
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
