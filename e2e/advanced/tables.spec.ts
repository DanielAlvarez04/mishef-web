import { expect, test } from "@playwright/test"

import { openRoute } from "../mobile/helpers"

test.describe("mesas del salón", () => {
  test("muestra zonas, disponibilidad y permite elegir una mesa libre", async ({
    page,
  }) => {
    await openRoute(page, "/pos")

    await page.locator("#pos-table").click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toContainText("Elegir mesa")
    await expect(dialog.getByText("Salón", { exact: true })).toBeVisible()

    const free = dialog.getByRole("button", { name: /Libre/ }).first()
    await expect(free).toBeVisible()

    await free.click()
    await dialog.getByRole("button", { name: "Usar mesa", exact: true }).click()

    await expect(dialog).toBeHidden()
    await expect(page.locator("#pos-table")).toContainText("Mesa")
  })
})
