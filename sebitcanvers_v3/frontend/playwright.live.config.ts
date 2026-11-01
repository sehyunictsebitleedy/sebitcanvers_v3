import { defineConfig } from "@playwright/test";
import preview from "./playwright.preview.config";

export default defineConfig(preview, {
  testMatch: "**/liveArtifacts.spec.ts",
  outputDir: "test-results/live-artifacts",
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/live-artifacts" }]],
});
