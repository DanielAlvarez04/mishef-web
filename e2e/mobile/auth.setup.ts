import fs from "node:fs"
import path from "node:path"

import { expect, test as setup } from "@playwright/test"

const AUTH_FILE = path.join(process.cwd(), "e2e/mobile/.auth/user.json")

/**
 * Inicia sesión una sola vez y reutiliza las cookies en todos los proyectos.
 *
 * La cuenta es la del seed local (`api/scripts/smoke-auth.mjs`). Se puede
 * apuntar a otra con `E2E_EMAIL` / `E2E_PASSWORD`.
 */
setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_EMAIL ?? "admin@naranjapimienta.local"
  const password = process.env.E2E_PASSWORD ?? "Naranja123!"

  await page.goto("/login")
  await page.locator("#identifier").fill(email)
  await page.locator("#password").fill(password)
  await page.getByRole("button", { name: "Entrar" }).click()

  await page.waitForURL("**/dashboard", { timeout: 30_000 })

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
  await page.context().storageState({ path: AUTH_FILE })

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
})
