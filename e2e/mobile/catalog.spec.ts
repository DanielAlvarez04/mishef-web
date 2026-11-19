import { expect, test } from "@playwright/test"

import { openRoute, viewportWidth } from "./helpers"

test.describe("catálogo móvil", () => {
  test("el editor abre a pantalla completa y pone Guardar como primero", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) >= 768, "Solo teléfono")

    await openRoute(page, "/catalog")
    await page.getByRole("button", { name: /Nuevo producto/ }).first().click()

    const dialog = page.locator('[data-slot="dialog-content"]')
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute("data-mobile", "full")

    const height = await dialog.evaluate(
      (element) => element.getBoundingClientRect().height
    )
    expect(height).toBeGreaterThanOrEqual((page.viewportSize()?.height ?? 0) - 1)

    const guardarComo = dialog.getByText("Guardar como", { exact: true })
    const imageInput = dialog.locator('input[type="file"]').first()

    const [fieldBox, imageBox] = await Promise.all([
      guardarComo.boundingBox(),
      imageInput.boundingBox(),
    ])

    expect(fieldBox).not.toBeNull()
    expect(imageBox).not.toBeNull()
    expect(fieldBox!.y).toBeLessThan(imageBox!.y)
  })

  test("las presentaciones son cards de 2 o 3 columnas", async ({ page }) => {
    await openRoute(page, "/catalog")
    await page.getByRole("button", { name: /Nuevo producto/ }).first().click()

    await page.getByRole("tab", { name: "Presentaciones" }).click()

    const multiple = page.locator("#product-multiple")
    if (!(await multiple.isChecked())) {
      await page.locator('label[for="product-multiple"]').click()
    }

    const group = page.getByRole("radiogroup", {
      name: "Presentación principal",
    })
    await expect(group).toBeVisible()

    const columns = await group.evaluate((element) => {
      const value = getComputedStyle(element).gridTemplateColumns
      return value.split(" ").filter(Boolean).length
    })

    expect(columns).toBe(viewportWidth(page) < 640 ? 2 : 3)
    await expect(group.getByLabel("Nombre de la presentación").first()).toBeVisible()
    await expect(
      group.getByRole("button", { name: /Agregar imagen|Reemplazar imagen/ }).first()
    ).toBeVisible()
  })

  test("las tabs largas se pueden desplazar sin romper la página", async ({
    page,
  }) => {
    await openRoute(page, "/settings")

    const tabs = page.getByRole("tablist").first()
    const metrics = await tabs.evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      overflowX: getComputedStyle(element).overflowX,
    }))

    expect(metrics.overflowX).toBe("auto")

    if (metrics.scrollWidth > metrics.clientWidth) {
      const lastTab = tabs.getByRole("tab").last()
      await lastTab.scrollIntoViewIfNeeded()
      await expect(lastTab).toBeVisible()
    }
  })
})
