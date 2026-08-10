// oxlint-disable no-ternary, sort-keys
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

const min = process.env.PLANNER_MIN === "1";

export default defineConfig({
  plugins: [tailwindcss()],
  input: "src/planner.css",
  build: {
    outDir: "dist",
    emptyOutDir: false,
    assetsDir: "",
    cssMinify: min ? "lightningcss" : false,
    rolldownOptions: {
      output: {
        assetFileNames: () => (min ? "planner.min.css" : "planner.css"),
      },
    },
  },
});
