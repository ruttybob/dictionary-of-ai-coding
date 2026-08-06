import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  // Each test spins a fresh WebGL context; cold-start under headless chromium
  // occasionally misses the data-ready deadline on the first try.
  retries: process.env.CI ? 2 : 0,
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:4317",
    colorScheme: "dark",
  },
  // Test against the built artifact (PRD #45): build first, then serve dist/.
  webServer: {
    command: "npm run build && npm run preview",
    port: 4317,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
