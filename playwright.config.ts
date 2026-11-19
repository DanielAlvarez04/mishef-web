import path from "node:path"

import { defineConfig, type Project } from "@playwright/test"

const AUTH_FILE = "e2e/mobile/.auth/user.json"
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000"

const VIEWPORTS: Array<{
  name: string
  width: number
  height: number
}> = [
  { name: "phone-360x800", width: 360, height: 800 },
  { name: "phone-390x844", width: 390, height: 844 },
  { name: "phone-landscape-844x390", width: 844, height: 390 },
  { name: "tablet-820x1180", width: 820, height: 1180 },
  { name: "tablet-landscape-1180x820", width: 1180, height: 820 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
]

const mobileProjects: Project[] = VIEWPORTS.map((viewport) => ({
  name: viewport.name,
  dependencies: ["setup"],
  use: {
    storageState: AUTH_FILE,
    viewport: { width: viewport.width, height: viewport.height },
    hasTouch: viewport.width < 1024,
    isMobile: viewport.width < 1024,
  },
}))

export default defineConfig({
  testDir: "./e2e/mobile",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  expect: { timeout: 10_000 },
  timeout: 60_000,
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
      // Servidor de producción: sin overlay de Next ni recargas por HMR.
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
      testMatch: /auth\.setup\.ts/,
    },
    ...mobileProjects,
  ],
})