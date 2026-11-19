import { expect, test } from "@playwright/test"

import {
  expectNoHorizontalOverflow,
  openRoute,
  usesBottomNav,
} from "./helpers"

const CORE_ROUTES = [
  "/dashboard",
  "/pos",
  "/kitchen",
  "/catalog",
  "/inventory",
  "/menus",
  "/settings",
  "/reports",
  "/attendance",
  "/billing",
]

test.describe("shell móvil", () => {
  test("las rutas principales no desbordan horizontalmente", async ({
    page,
  }) => {
    test.setTimeout(150_000)

    for (const route of CORE_ROUTES) {
      await openRoute(page, route)
      await expectNoHorizontalOverflow(page)
    }
  })

  test("la barra inferior aparece solo por debajo de 1024px", async ({
    page,
  }) => {
    await openRoute(page, "/dashboard")

    const nav = page.getByRole("navigation", { name: "Navegación principal" })

    if (usesBottomNav(page)) {
      await expect(nav).toBeVisible()
      await expect(
        nav.getByRole("link", { name: "Punto de venta", exact: true })
      ).toBeVisible()
    } else {
      await expect(nav).toBeHidden()
      await expect(
        page.locator('[data-slot="sidebar"]:not([data-mobile="true"])').first()
      ).toBeVisible()
    }
  })

  test("la barra navega y abre el sidebar completo", async ({ page }) => {
    test.skip(!usesBottomNav(page), "Solo aplica a la barra inferior")

    await openRoute(page, "/dashboard")

    const nav = page.getByRole("navigation", { name: "Navegación principal" })

    await nav.getByRole("link", { name: "Menús", exact: true }).click()
    await expect(page).toHaveURL(/\/menus$/)

    await nav.getByRole("link", { name: "Punto de venta", exact: true }).click()
    await expect(page).toHaveURL(/\/pos$/)
    await expect(
      nav.getByRole("link", { name: "Punto de venta", exact: true })
    ).toHaveAttribute("aria-current", "page")

    await page
      .getByRole("button", { name: "Abrir menú de navegación" })
      .click()
    await expect(
      page.locator('[data-slot="sidebar"][data-mobile="true"]')
    ).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(
      page.locator('[data-slot="sidebar"][data-mobile="true"]')
    ).toBeHidden()
  })
})
