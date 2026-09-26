import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:4317",
    colorScheme: "dark",
  },
  webServer: {
    command: "npm run build && npm run preview",
    port: 4317,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
