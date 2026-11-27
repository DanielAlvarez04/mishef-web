import { expect, test } from "@playwright/test"

import { openRoute, viewportWidth } from "./helpers"

test.describe("POS móvil", () => {
  test("el diálogo del platillo usa 2 o 3 columnas según el ancho", async ({
    page,
  }) => {
    await openRoute(page, "/pos")

    await page.getByLabel("Buscar por nombre, categoría o grupo").fill("Latte")
    const product = page
      .getByRole("button", { name: "Abrir Latte", exact: true })
      .first()
    await expect(product).toBeVisible()
    await product.click()

    const dialog = page.locator('[data-slot="dialog-content"]')
    await expect(dialog).toBeVisible()

    const width = viewportWidth(page)
    if (width < 768) {
      const height = await dialog.evaluate(
        (element) => element.getBoundingClientRect().height
      )
      expect(height).toBeGreaterThanOrEqual(
        (page.viewportSize()?.height ?? 0) - 12
      )
    }

    const variants = page.locator('[aria-label^="Elegir "]')
    await expect(variants).not.toHaveCount(0)

    const columns = await variants.first().evaluate((element) => {
      const grid = element.parentElement?.parentElement
      return getComputedStyle(grid as Element).gridTemplateColumns
        .split(" ")
        .filter(Boolean).length
    })

    expect(columns).toBe(width < 640 ? 2 : 3)
  })

  test("la comanda vive en un sheet por debajo de 1280px", async ({ page }) => {
    await openRoute(page, "/pos")

    const width = viewportWidth(page)
    const pill = page.getByRole("button", { name: "Ver pedido actual" })

    if (width < 1280) {
      await expect(pill).toBeVisible()
      await pill.click()

      await expect(page.getByText("Revisa la cuenta y envía la ronda")).toBeVisible()
      await expect(
        page.getByRole("button", { name: /Abrir cuenta y enviar/ })
      ).toBeVisible()

      await page.keyboard.press("Escape")
      await expect(
        page.getByText("Revisa la cuenta y envía la ronda")
      ).toBeHidden()
    } else {
      await expect(pill).toBeHidden()
      await expect(
        page.locator('[data-slot="sidebar-inset"]').getByText("Comanda", {
          exact: true,
        })
      ).toBeVisible()
    }
  })

  test("la barra de herramientas no amontona los controles", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) >= 640, "El corte móvil es < 640px")

    await openRoute(page, "/pos")

    const search = page.getByLabel("Buscar por nombre, categoría o grupo")
    const tools = page.getByRole("button", {
      name: "Herramientas del punto de venta",
    })

    const searchBox = await search.boundingBox()
    const toolsBox = await tools.boundingBox()

    expect(searchBox?.width ?? 0).toBeGreaterThan(160)
    expect(Math.abs((toolsBox?.y ?? 0) - (searchBox?.y ?? 0))).toBeLessThan(8)

    await tools.click()
    await expect(
      page.getByRole("menuitem", { name: /Menú global/ })
    ).toBeVisible()
    await expect(page.getByRole("menuitem", { name: /Ordenar/ })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: /Vista/ })).toBeVisible()
  })
})
