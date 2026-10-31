import { defineConfig } from "@playwright/test";
import qa from "./playwright.qa.config";

export default defineConfig(qa, {
  testMatch: "**/releaseMatrix.spec.ts",
  testIgnore: [],
  outputDir: "test-results/preview",
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/preview" }]],
  use: { baseURL: "http://127.0.0.1:5175" },
  webServer: {
    command: "node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5175 --strictPort",
    url: "http://127.0.0.1:5175",
    reuseExistingServer: false,
  },
});
