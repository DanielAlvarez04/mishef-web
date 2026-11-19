import { expect, test } from "@playwright/test"

import { openRoute } from "./helpers"

test.describe("preferencias por dispositivo", () => {
  test("Mostrar KPIs del catálogo se conserva tras recargar", async ({
    page,
  }) => {
    await openRoute(page, "/catalog")

    const toggle = page.getByRole("switch")
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute("aria-checked", "true")

    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-checked", "false")
    await expect
      .poll(async () =>
        page.evaluate(() => localStorage.getItem("catalog-show-kpis"))
      )
      .toBe("false")

    await page.reload()
    await expect(page.getByRole("switch")).toHaveAttribute(
      "aria-checked",
      "false"
    )

    await page.getByRole("switch").click()
    await expect(page.getByRole("switch")).toHaveAttribute(
      "aria-checked",
      "true"
    )
  })
})
