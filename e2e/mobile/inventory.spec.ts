import { expect, test } from "@playwright/test"

import { openRoute, viewportWidth } from "./helpers"

test.describe("inventario móvil", () => {
  test("los diálogos apilan los campos en teléfono", async ({ page }) => {
    test.skip(viewportWidth(page) >= 768, "Solo teléfono")

    await openRoute(page, "/inventory")
    await page.getByRole("button", { name: /Nuevo insumo/ }).first().click()

    const dialog = page.locator('[data-slot="dialog-content"]')
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute("data-mobile", "full")

    const name = dialog.locator("#ingredient-name")
    const unit = dialog.locator("#ingredient-unit")

    const [nameBox, unitBox] = await Promise.all([
      name.boundingBox(),
      unit.boundingBox(),
    ])

    expect(nameBox).not.toBeNull()
    expect(unitBox).not.toBeNull()
    expect(Math.abs((nameBox!.x ?? 0) - (unitBox!.x ?? 0))).toBeLessThanOrEqual(1)
    expect(unitBox!.y).toBeGreaterThan(nameBox!.y)

    await page.keyboard.press("Escape")
  })

  test("el switch de KPIs se conserva tras recargar", async ({ page }) => {
    await openRoute(page, "/inventory")

    const toggle = page.getByRole("switch")
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute("aria-checked", "true")
    await expect(page.getByText("Estado del inventario")).toBeVisible()

    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-checked", "false")
    await expect(page.getByText("Estado del inventario")).toBeHidden()

    await page.reload()
    await expect(page.getByRole("switch")).toHaveAttribute(
      "aria-checked",
      "false"
    )
    await expect(page.getByText("Estado del inventario")).toBeHidden()

    await page.getByRole("switch").click()
    await expect(page.getByRole("switch")).toHaveAttribute(
      "aria-checked",
      "true"
    )
  })
})
