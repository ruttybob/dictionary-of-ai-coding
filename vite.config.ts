import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The wiki site is a Vite app whose root is site/. Built output lands at the
// repo-root /dist so site/ stays source-only.
export default defineConfig({
  root: "site",
  plugins: [react()],
  server: { port: 4317 },
  preview: { port: 4317 },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
