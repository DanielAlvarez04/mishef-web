import path from "node:path"

import { defineConfig } from "@playwright/test"

const AUTH_FILE = "e2e/mobile/.auth/user.json"
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000"

/**
 * Suite del flujo avanzado de cocina.
 *
 * Va en un config aparte porque cambia el modo de la sucursal y crea una
 * estación: debe correr sola, sin mezclarse con la matriz móvil.
 */
export default defineConfig({
  testDir: "./e2e/advanced",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report-advanced", open: "never" }],
  ],
  expect: { timeout: 15_000 },
  timeout: 180_000,
  use: {
    baseURL: BASE_URL,
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run start:dev",
      cwd: path.join(process.cwd(), "..", "api"),
      url: "http://localhost:3001/v1/health",
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: "npm run build && npm run start -- -p 3000",
      cwd: process.cwd(),
      url: `${BASE_URL}/login`,
      reuseExistingServer: true,
      timeout: 300_000,
    },
  ],
  projects: [
    {
      name: "setup",
      testDir: "./e2e/mobile",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "kitchen-advanced",
      dependencies: ["setup"],
      use: {
        storageState: AUTH_FILE,
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
})
