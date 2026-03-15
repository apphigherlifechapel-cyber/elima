import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/playwright",
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
  },
});