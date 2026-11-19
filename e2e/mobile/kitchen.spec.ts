import { expect, test } from "@playwright/test"

import { openRoute, viewportWidth } from "./helpers"

test.describe("cocina móvil", () => {
  test("en vertical usa tabs con icono y conteo", async ({ page }) => {
    const width = viewportWidth(page)
    const height = page.viewportSize()?.height ?? 0
    test.skip(width >= 1024 || width >= height, "Solo tablet/teléfono vertical")

    await openRoute(page, "/kitchen")

    const tabs = page.getByRole("group", { name: "Estado de las comandas" })
    await expect(tabs).toBeVisible()
    await expect(
      tabs.getByRole("button", { name: /Pendientes/ })
    ).toHaveAttribute("aria-pressed", "true")

    await expect(
      page.getByRole("heading", { name: "Pendiente" })
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "En preparación" })
    ).toBeHidden()

    await tabs.getByRole("button", { name: /Preparación/ }).click()
    await expect(
      page.getByRole("heading", { name: "En preparación" })
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Pendiente" })
    ).toBeHidden()
  })

  test("en horizontal muestra las tres columnas con scroll si hace falta", async ({
    page,
  }) => {
    const width = viewportWidth(page)
    const height = page.viewportSize()?.height ?? 0
    test.skip(width >= 1024 || width < height, "Solo tablet/teléfono horizontal")

    await openRoute(page, "/kitchen")

    await expect(
      page.getByRole("group", { name: "Estado de las comandas" })
    ).toBeHidden()
    await expect(
      page.getByRole("heading", { name: "Pendiente" })
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "En preparación" })
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Lista" })
    ).toBeVisible()

    const board = await page
      .getByRole("heading", { name: "Pendiente" })
      .evaluate((element) => {
        const grid = element.closest("section")?.parentElement
        return grid
          ? { scrollWidth: grid.scrollWidth, clientWidth: grid.clientWidth }
          : null
      })

    expect(board).not.toBeNull()
    expect(board?.scrollWidth ?? 0).toBeGreaterThanOrEqual(
      board?.clientWidth ?? 0
    )
  })

  test("en escritorio mantiene las tres columnas sin tabs", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) < 1024, "Solo escritorio/tablet horizontal ancha")

    await openRoute(page, "/kitchen")

    await expect(
      page.getByRole("group", { name: "Estado de las comandas" })
    ).toBeHidden()
    await expect(
      page.getByRole("heading", { name: "Pendiente" })
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "En preparación" })
    ).toBeVisible()
    await expect(page.getByRole("heading", { name: "Lista" })).toBeVisible()
  })
})
