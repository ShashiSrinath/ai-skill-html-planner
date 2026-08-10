// oxlint-disable no-ternary, sort-keys
import { defineConfig } from "vite";

const min = process.env.PLANNER_MIN === "1";

export default defineConfig({
  input: "src/runtime/main.ts",
  build: {
    outDir: "dist",
    emptyOutDir: false,
    minify: min ? undefined : false,
    rolldownOptions: {
      output: {
        format: "iife",
        entryFileNames: () => (min ? "planner.min.js" : "planner.js"),
      },
    },
  },
});
