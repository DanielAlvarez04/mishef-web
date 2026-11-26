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
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000"

async function ensureCashSession(page: Page) {
  const current = await page.request.get(`${API_URL}/cash/sessions/current`, {
    headers: { Origin: BASE_URL },
  })

  if (current.ok()) {
    const data = (await current.json()) as { session?: { id: string } | null }
    if (data.session) return
  }

  const opened = await page.request.post(`${API_URL}/cash/sessions`, {
    headers: { Origin: BASE_URL },
    data: { openingFloat: 0 },
  })

  if (!opened.ok() && opened.status() !== 409) {
    throw new Error(
      `No se pudo abrir la caja para el E2E (${opened.status()}): ${await opened.text()}`
    )
  }
}

let restoreMode: "GENERAL" | "ADVANCED" | null = null

async function ensureBranch(page: Page) {
  const response = await page.request.get(`${API_URL}/branches`, {
    headers: { Origin: BASE_URL },
  })
  const branches = response.ok()
    ? ((await response.json()) as Array<{ id: string; isActive: boolean }>)
    : []

  if (branches.some((branch) => branch.isActive)) return

  const created = await page.request.post(`${API_URL}/branches`, {
    headers: { Origin: BASE_URL },
    data: { name: "E2E Sucursal" },
  })

  if (!created.ok() && created.status() !== 409) {
    throw new Error(
      `No se pudo crear la sucursal E2E (${created.status()}): ${await created.text()}`
    )
  }
}

async function readKitchenMode(page: Page) {
  const response = await page.request.get(`${API_URL}/kitchen/mode`, {
    headers: { Origin: BASE_URL },
  })

  if (!response.ok()) {
    throw new Error(`No se pudo leer el modo de cocina (${response.status()})`)
  }

  return ((await response.json()) as { mode: "GENERAL" | "ADVANCED" }).mode
}

async function writeKitchenMode(page: Page, mode: "GENERAL" | "ADVANCED") {
  const response = await page.request.patch(`${API_URL}/kitchen/mode`, {
    headers: { Origin: BASE_URL },
    data: { mode },
  })

  if (!response.ok()) {
    throw new Error(
      `No se pudo cambiar el modo de cocina (${response.status()}): ${await response.text()}`
    )
  }
}

async function ensureStation(page: Page) {
  const configResponse = await page.request.get(`${API_URL}/kitchen/config`, {
    headers: { Origin: BASE_URL },
  })

  if (!configResponse.ok()) {
    throw new Error(
      `No se pudo leer la configuración de cocina (${configResponse.status()})`
    )
  }

  const config = (await configResponse.json()) as {
    stations: Array<{ name: string }>
  }

  if (config.stations.some((station) => station.name === STATION_NAME)) return

  const created = await page.request.post(`${API_URL}/kitchen/stations`, {
    headers: { Origin: BASE_URL },
    data: { name: STATION_NAME, slaMinutes: null },
  })

  if (!created.ok()) {
    throw new Error(
      `No se pudo crear la estación E2E (${created.status()}): ${await created.text()}`
    )
  }
}

async function ensureProduct(page: Page) {
  const response = await page.request.post(`${API_URL}/catalog/items`, {
    headers: { Origin: BASE_URL },
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

    await writeKitchenMode(page, "GENERAL")
    restoreMode = null
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

    // 1. Configuración de la sucursal (API, para no mezclar la navegación de
    // Server Actions de /settings con el flujo del POS).
    await ensureBranch(page)
    restoreMode = await readKitchenMode(page)
    await writeKitchenMode(page, "ADVANCED")
    await ensureStation(page)
    await ensureProduct(page)

    // 2. Comanda desde el POS (mostrador para identificar por cliente).
    await ensureCashSession(page)
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
      .getByRole("button", { name: /Cobrar y enviar/ })
      .click()

    const chargeDialog = page.getByRole("dialog")
    await expect(chargeDialog).toBeVisible()
    await chargeDialog
      .getByRole("button", { name: "Continuar", exact: true })
      .click()
    await chargeDialog
      .getByRole("button", { name: "Cobrar y confirmar", exact: true })
      .click()

    await expect(
      page.getByText("Pago confirmado · pedido enviado a cocina")
    ).toBeVisible()

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

    // La cuenta de mostrador se cierra automáticamente al entregar.
    await expect
      .poll(async () => {
        const response = await page.request.get(
          `${API_URL}/orders?status=OPEN`,
          { headers: { Origin: BASE_URL } }
        )
        const orders = response.ok()
          ? ((await response.json()) as Array<{ customerName?: string | null }>)
          : []
        return orders.some((order) => order.customerName === customerName)
      })
      .toBe(false)

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
