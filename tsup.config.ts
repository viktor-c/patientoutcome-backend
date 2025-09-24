import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src", "!src/**/__tests__/**", "!src/**/*.test.*", "!src/**/*.yaml.*", "!src/**/*.md"],
  splitting: false,
  sourcemap: true,
  clean: true,
  format: ["cjs"],
  esbuildOptions: (options) => {
    // Handle path mapping for @/*
    options.alias = {
      "@": "./src",
    };
  },
});
