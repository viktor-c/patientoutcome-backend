import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@scripts": path.resolve(__dirname, "scripts"),
    },
  },
  test: {
    coverage: {
      exclude: ["**/node_modules/**", "**/index.ts"],
    },
    globals: true,
    restoreMocks: true,
    sequence: {shuffle: {tests: false}},
  },
  plugins: [],
});
