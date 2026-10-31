import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Uses the locally installed browsers, with isolated test profiles.
export default defineConfig(base, {
  testIgnore: "**/releaseMatrix.spec.ts",
  projects: [
    { name: "chrome", use: { browserName: "chromium", channel: "chrome" } },
    { name: "edge", use: { browserName: "chromium", channel: "msedge" } },
  ],
  reporter: [["list"], ["html", { open: "never" }]],
  use: { trace: "retain-on-failure" },
});
