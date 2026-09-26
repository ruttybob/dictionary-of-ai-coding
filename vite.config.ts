import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

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
