import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import { evidencePath } from "./tests/browser/evidence.js";
export default defineConfig({
  testDir: "tests/browser",
  timeout: 60000,
  expect: { timeout: 15000 },
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["json", { outputFile: evidencePath("browser-results.json") }],
  ],
  use: {
    baseURL: "http://127.0.0.1:4175",
    viewport: { width: 1440, height: 960 },
    headless: true,
    launchOptions: {
      args: [
        "--disable-dev-shm-usage",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  outputDir: process.env.RENOVATION_ACCEPTANCE_DIR ? evidencePath("playwright-artifacts") : ".runtime/test-results",
  webServer: {
    command: "bash scripts/run-workbench.sh",
    env: {
      PORT: "4175",
      APP_WEB_DIST: resolve(process.env.APP_WEB_DIST || ".runtime/week2-release/web"),
      APP_ENGINE_DIR: resolve(process.env.APP_ENGINE_DIR || ".runtime/week2-release/engine"),
      APP_ORIGIN: "http://127.0.0.1:4175",
      APP_DATA_DIR: resolve(".runtime/browser-test-data"),
    },
    url: "http://127.0.0.1:4175/healthz",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
