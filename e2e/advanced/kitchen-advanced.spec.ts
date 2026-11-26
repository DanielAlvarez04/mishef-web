import { expect, test, type Page } from "@playwright/test"

import { openRoute } from "../mobile/helpers"

/**
 * Flujo avanzado de cocina de punta a punta:
 *
 * 1. Configurar la sucursal en modo Avanzado y crear una estación.
 * 2. Enviar una comanda desde el POS.
 * 3. Imprimir la comanda, iniciar, marcar listo y validar en el pase.
 * 4. Recoger, entregar y revisar el historial.
 * 5. Rehacer el ticket desde la bandeja de recientes.
 *
 * El modo se restaura al terminar. La estación y la comanda quedan como datos
 * de prueba locales para poder repetir la corrida.
 */

const STATION_NAME = "A E2E Parrilla"
const PRODUCT_NAME = "E2E Hamburguesa"
const PRODUCT_SKU = "E2E-KITCHEN"
const API_URL = process.env.E2E_API_URL ?? "http://localhost:3001/v1"

let restoreMode: "GENERAL" | "ADVANCED" | null = null

async function chooseOption(page: Page, triggerSelector: string, label: string) {
  await page.locator(triggerSelector).click()
  await page
    .locator('[data-slot="select-item"]')
    .filter({ hasText: label })
    .first()
    .click()
}

async function ensureBranch(page: Page) {
  await page.getByRole("tab", { name: "Negocio", exact: true }).click()
  await expect(page.getByText("Sucursales", { exact: true })).toBeVisible()

  const empty = page.getByText("Aún no hay sucursales.")
  if (!(await empty.isVisible().catch(() => false))) return

  const name = "E2E Sucursal"
  await page.locator("#branch-name").fill(name)
  await page.getByRole("button", { name: "Crear sucursal", exact: true }).click()
  await expect(page.getByText(name, { exact: true })).toBeVisible()
}

async function openKitchenSettings(page: Page, createBranch = false) {
  await openRoute(page, "/settings")
  if (createBranch) await ensureBranch(page)
  await page.getByRole("tab", { name: "Cocina", exact: true }).click()
  await expect(page.locator("#kitchen-mode")).toBeVisible()
}

async function setKitchenMode(page: Page, mode: "General" | "Avanzado") {
  const trigger = page.locator("#kitchen-mode")

  if (((await trigger.textContent()) ?? "").includes(mode)) return

  await chooseOption(page, "#kitchen-mode", mode)
  await expect(trigger).toContainText(mode)
}

async function ensureStation(page: Page) {
  const existing = page.getByText(STATION_NAME, { exact: true })

  if ((await existing.count()) > 0) return

  const input = page.getByPlaceholder("Ej. Parrilla")
  await input.fill(STATION_NAME)
  await input
    .locator("..")
    .getByRole("button", { name: "Agregar", exact: true })
    .click()

  await expect(page.getByText(STATION_NAME, { exact: true }).first()).toBeVisible()
}

async function ensureProduct(page: Page) {
  const response = await page.request.post(`${API_URL}/catalog/items`, {
    headers: { Origin: new URL(page.url()).origin },
    data: {
      name: PRODUCT_NAME,
      sku: PRODUCT_SKU,
      price: 10,
      taxRate: 0,
      prepMinutes: 5,
    },
  })

  if (response.ok() || response.status() === 409) return

  throw new Error(
    `No se pudo preparar el producto E2E (${response.status()}): ${await response.text()}`
  )
}

test.describe("cocina avanzada", () => {
  test.afterEach(async ({ page }) => {
    if (restoreMode !== "GENERAL") return

    await openKitchenSettings(page)
    const trigger = page.locator("#kitchen-mode")

    if (!(await trigger.isVisible().catch(() => false))) return

    if (((await trigger.textContent()) ?? "").includes("Avanzado")) {
      await setKitchenMode(page, "General")
    }
  })

  test("configura, opera y rehace una comanda por estación", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("pwa-install-dismissed", "1")
      } catch {
        // Sin localStorage el aviso de instalación aparecería a los 3 s.
      }

      const instrumented = window as unknown as { __printCalls?: number }
      instrumented.__printCalls = 0
      window.print = () => {
        instrumented.__printCalls = (instrumented.__printCalls ?? 0) + 1
      }
    })

    const customerName = `E2E ${Date.now()}`

    // 1. Configuración de la sucursal.
    await openKitchenSettings(page, true)

    const initialMode = ((await page.locator("#kitchen-mode").textContent()) ??
      "").includes("Avanzado")
      ? "ADVANCED"
      : "GENERAL"

    restoreMode = initialMode

    await setKitchenMode(page, "Avanzado")
    await expect(page.getByPlaceholder("Ej. Parrilla")).toBeVisible()
    await ensureStation(page)
    await ensureProduct(page)

    // 2. Comanda desde el POS (mostrador para identificar por cliente).
    await openRoute(page, "/pos")
    await page.getByRole("button", { name: "Mostrador", exact: true }).click()
    await page.locator("#pos-customer").fill(customerName)

    await page
      .getByRole("textbox", { name: "Buscar por nombre, categoría o grupo" })
      .fill(PRODUCT_NAME)

    await page
      .getByRole("button", { name: `Abrir ${PRODUCT_NAME}` })
      .first()
      .click()

    const productDialog = page
      .locator('[data-slot="dialog-content"]')
      .filter({ hasText: PRODUCT_NAME })
    await expect(productDialog).toBeVisible()
    await productDialog
      .getByRole("button", { name: `Añadir una unidad de ${PRODUCT_NAME}` })
      .click()
    await productDialog
      .getByRole("button", { name: "Añadir a la comanda", exact: true })
      .click()

    await expect(
      page.getByText("Elige artículos del catálogo para armar la ronda.")
    ).toBeHidden()

    await page
      .getByRole("button", { name: "Abrir cuenta y enviar", exact: true })
      .click()

    await expect(page.getByText(/^Ronda enviada/)).toBeVisible()

    // 3. Tablero avanzado: el ticket cae en la estación creada.
    await openRoute(page, "/kitchen")
    await expect(page.getByText(/modo Avanzado/)).toBeVisible()

    const stationSection = page
      .locator("section")
      .filter({ hasText: STATION_NAME })
    await expect(stationSection).toBeVisible()

    const ticket = stationSection
      .locator("li")
      .filter({ hasText: customerName })
      .first()
    await expect(ticket).toBeVisible()
    await expect(ticket.getByText("Pendiente")).toBeVisible()

    // 4. Impresión: se invoca window.print y el área térmica tiene la comanda.
    await ticket.getByRole("button", { name: "Imprimir" }).click()
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as { __printCalls?: number }).__printCalls ?? 0
        )
      )
      .toBe(1)

    const printArea = page.locator(".kitchen-print-area")
    await expect(printArea).toContainText(STATION_NAME)
    await expect(printArea).toContainText(PRODUCT_NAME)

    await page.emulateMedia({ media: "print" })
    await expect(printArea).toBeVisible()
    await page.emulateMedia({ media: "screen" })
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")))
    await expect(printArea).toHaveCount(0)

    // 5. Transiciones: empezar → listo → pase → recoger → entregar.
    await ticket.getByRole("button", { name: "Empezar" }).click()
    await ticket.getByRole("button", { name: "Listo" }).click()
    await ticket.getByRole("button", { name: "Validar pase" }).click()
    await expect(ticket.getByText("Pase validado")).toBeVisible()

    await ticket.getByRole("button", { name: "Recoger" }).click()
    await ticket.getByRole("button", { name: "Entregar" }).click()

    // 6. El ticket entregado pasa a Recientes; el historial queda completo.
    await page.getByRole("button", { name: /^Recientes/ }).click()

    const recentTicket = page
      .locator("li")
      .filter({ hasText: customerName })
      .first()
    await expect(recentTicket.getByText("Entregado")).toBeVisible()

    await recentTicket.getByRole("button", { name: "Historial" }).click()

    const history = page.locator('[data-slot="dialog-content"]')
    await expect(history).toContainText("Ticket creado")
    await expect(history).toContainText("Validado en pase")
    await expect(history).toContainText("Entregado")

    await page.keyboard.press("Escape")
    await expect(history).toBeHidden()

    // 7. Refire desde Recientes: nace una comanda nueva en la estación.
    await recentTicket.getByRole("button", { name: "Rehacer" }).click()

    const confirm = page.locator('[data-slot="alert-dialog-content"]')
    await expect(confirm).toContainText("¿Rehacer ticket?")
    await confirm
      .getByRole("button", { name: "Rehacer", exact: true })
      .click()

    await expect(
      page.getByText("Ticket rehecho: nueva comanda creada")
    ).toBeVisible()

    await page.getByRole("button", { name: "Estaciones", exact: true }).click()

    const refired = page
      .locator("section")
      .filter({ hasText: STATION_NAME })
      .locator("li")
      .filter({ hasText: customerName })
      .first()

    await expect(refired.getByRole("button", { name: "Empezar" })).toBeVisible()
  })
})
