import { expect, type Page } from "@playwright/test"

/** ¿El viewport usa la barra inferior? (corte de 1024px). */
export function usesBottomNav(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) < 1024
}

/** Ancho del viewport actual. */
export function viewportWidth(page: Page): number {
  return page.viewportSize()?.width ?? 0
}

/**
 * La página no debe desbordarse horizontalmente.
 *
 * Se revisan el documento y el contenedor con scroll del shell: una tabla
 * puede tener su propio scroll, pero la app entera no.
 */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement
    const scrollable = document.querySelector<HTMLElement>(
      '[data-slot="sidebar-inset"]'
    )

    return {
      document: root.scrollWidth - window.innerWidth,
      shell: scrollable ? scrollable.scrollWidth - scrollable.clientWidth : 0,
    }
  })

  expect(overflow.document, "scroll horizontal del documento").toBeLessThanOrEqual(1)
  expect(overflow.shell, "scroll horizontal del shell").toBeLessThanOrEqual(1)
}

/** Abre una ruta y espera a que el shell esté listo. */
export async function openRoute(page: Page, route: string) {
  await page.goto(route)
  await page.waitForLoadState("domcontentloaded")
  await expect(page.locator('[data-slot="sidebar-inset"]')).toBeVisible()
}

/** Número de columnas efectivas de un grid. */
export async function gridColumnCount(
  page: Page,
  selector: string
): Promise<number> {
  return page.locator(selector).first().evaluate((element) => {
    const columns = getComputedStyle(element).gridTemplateColumns
    return columns.split(" ").filter(Boolean).length
  })
}
