import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:4317",
    colorScheme: "dark",
  },
  webServer: {
    command: "npm run generate:site && node tests/serve.mjs",
    port: 4317,
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
});
