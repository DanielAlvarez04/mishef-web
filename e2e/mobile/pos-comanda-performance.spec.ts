import { expect, test, type Page, type Request } from "@playwright/test"

import { openRoute } from "./helpers"

/**
 * Regresiones de rendimiento de la comanda:
 *
 * - Mesa y clientes se pintan de inmediato aunque la Server Action tarde.
 * - Esas acciones no vuelven a pedir el catálogo ni la ruta completa.
 * - Un cambio de estado de ronda no vacía los artículos de la comanda.
 *
 * Los datos se crean por API con la sesión del setup y se cancelan al final.
 */

const API_URL = process.env.E2E_API_URL ?? "http://localhost:3001/v1"
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000"
const PRODUCT_NAME = "E2E Comanda Rendimiento"
const PRODUCT_SKU = "E2E-POS-PERF"

const headers = { Origin: BASE_URL }

interface ProfilerCommit {
  id: string
  phase: string
  actualDuration: number
  baseDuration: number
  commitTime: number
}

declare global {
  interface Window {
    __posLongTasks?: number[]
    __posLongTaskObserver?: PerformanceObserver
  }
}

interface DiningTableResponse {
  id: string
  number: string
  activeOrders: Array<{ id: string }>
}

interface CreatedOrder {
  id: string
  guests?: Array<{ id: string; name: string }>
}

interface CreatedRound {
  id: string
}

async function findOrCreateProduct(page: Page): Promise<string> {
  const existing = await page.request.get(
    `${API_URL}/catalog/items?search=${encodeURIComponent(PRODUCT_NAME)}`,
    { headers }
  )

  if (existing.ok()) {
    const items = (await existing.json()) as Array<{ id: string; name: string }>
    const match = items.find((item) => item.name === PRODUCT_NAME)

    if (match) return match.id
  }

  const created = await page.request.post(`${API_URL}/catalog/items`, {
    headers,
    data: {
      name: PRODUCT_NAME,
      sku: PRODUCT_SKU,
      price: 10,
      taxRate: 0,
      prepMinutes: 5,
    },
  })

  if (!created.ok()) {
    throw new Error(
      `No se pudo crear el artículo E2E (${created.status()}): ${await created.text()}`
    )
  }

  const item = (await created.json()) as { id: string }
  return item.id
}

async function freeTables(page: Page): Promise<DiningTableResponse[]> {
  const response = await page.request.get(`${API_URL}/tables`, { headers })

  if (!response.ok()) return []

  const tables = (await response.json()) as DiningTableResponse[]
  return tables.filter(
    (table) => table.activeOrders.length === 0
  )
}

async function dismissInstallDialog(page: Page) {
  const dialog = page
    .getByRole("alertdialog")
    .filter({ hasText: "Instala Mishef en este dispositivo" })

  try {
    await dialog.waitFor({ state: "visible", timeout: 1_200 })
    const action = dialog
      .getByRole("button", { name: /Entendido|Ahora no/ })
      .first()

    if (await action.isVisible().catch(() => false)) {
      await action.click({ timeout: 2_000 }).catch(() => {})
      await dialog.waitFor({ state: "hidden", timeout: 2_000 }).catch(() => {})
    }
  } catch {
    // El aviso es opcional; si no aparece, seguimos.
  }
}

test.describe("comanda · mesa y clientes", () => {
  let orderId: string | null = null
  let matrixOrderIds: string[] = []

  test.afterEach(async ({ page }) => {
    for (const id of matrixOrderIds) {
      await page.request.patch(`${API_URL}/orders/${id}/cancel`, {
        headers,
        data: { reason: "Limpieza E2E de rendimiento" },
      })
    }
    matrixOrderIds = []

    if (!orderId) return

    await page.request.patch(`${API_URL}/orders/${orderId}/cancel`, {
      headers,
      data: { reason: "Limpieza E2E de rendimiento" },
    })
    orderId = null
  })

  test("optimista, sin recargar la ruta y sin borrar la comanda", async ({
    page,
  }) => {
    const productId = await findOrCreateProduct(page)
    const tables = await freeTables(page)

    test.skip(tables.length < 2, "Se necesitan dos mesas libres para la prueba")

    const created = await page.request.post(`${API_URL}/orders`, {
      headers,
      data: {
        tableIds: [tables[0].id],
        channel: "DINE_IN",
        partySize: 1,
        guests: [{ name: "E2E Cliente" }],
        idempotencyKey: `e2e-pos-perf-${Date.now()}`,
      },
    })

    expect(created.ok()).toBeTruthy()
    const order = (await created.json()) as CreatedOrder
    orderId = order.id

    const roundResponse = await page.request.post(
      `${API_URL}/orders/${order.id}/rounds`,
      {
        headers,
        data: {
          items: [
            {
              itemId: productId,
              quantity: 2,
              guestId: order.guests?.[0]?.id,
            },
          ],
          idempotencyKey: `e2e-pos-perf-round-${Date.now()}`,
        },
      }
    )

    expect(roundResponse.ok()).toBeTruthy()
    const round = (await roundResponse.json()) as CreatedRound

    const listedResponse = await page.request.get(
      `${API_URL}/orders?status=OPEN`,
      { headers }
    )
    const listedOrders = (await listedResponse.json()) as Array<{
      id: string
      updatedAt?: string
    }>
    expect(
      listedOrders.find((entry) => entry.id === order.id)?.updatedAt
    ).toBeTruthy()

    const profilerCommits: ProfilerCommit[] = []
    let actionProfilerStart = 0
    page.on("console", (message) => {
      const text = message.text()
      const marker = text.indexOf("[pos-profiler]")

      if (marker < 0) return

      try {
        profilerCommits.push(
          JSON.parse(
            text.slice(marker + "[pos-profiler]".length).trim()
          ) as ProfilerCommit
        )
      } catch {
        // Un log de desarrollo incompleto no invalida la medición.
      }
    })

    await openRoute(page, "/pos?pos-profiler=1")

    await page.evaluate(() => {
      window.__posLongTasks = []
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__posLongTasks?.push(entry.duration)
        }
      })
      observer.observe({ type: "longtask", buffered: true })
      window.__posLongTaskObserver = observer
    })
    await dismissInstallDialog(page)

    const rscRequests: string[] = []
    page.on("request", (request) => {
      if (request.url().includes("_rsc=")) rscRequests.push(request.url())
    })

    await page
      .getByRole("button", { name: /Cuentas abiertas/ })
      .first()
      .click()

    const accountRow = page
      .locator('[data-slot="item"]')
      .filter({ hasText: new RegExp(`Mesa ${tables[0].number}\\b`) })
      .first()

    await expect(accountRow).toBeVisible()
    await accountRow.getByRole("button", { name: "Ver comanda" }).click()

    await expect(
      page.getByText(`2× ${PRODUCT_NAME}`).first()
    ).toBeVisible()

    // Deja terminar la precarga de cobro/detalle antes de medir acciones.
    await page.waitForTimeout(800)
    actionProfilerStart = profilerCommits.length
    await page.evaluate(() => {
      window.__posLongTasks = []
    })
    await dismissInstallDialog(page)

    const isServerAction = (request: Request) =>
      request.method() === "POST" &&
      Boolean(request.headers()["next-action"])

    // Las Server Actions se retrasan para demostrar que la UI es optimista.
    let actionDelayMs = 0
    await page.route("**/pos**", async (route) => {
      const request = route.request()

      if (
        actionDelayMs > 0 &&
        request.method() === "POST" &&
        request.headers()["next-action"]
      ) {
        await new Promise((resolve) => setTimeout(resolve, actionDelayMs))
      }

      await route.continue()
    })

    const tableButton = page
      .locator("#pos-table:visible, #mobile-pos-table:visible")
      .first()

    const compact = (page.viewportSize()?.width ?? 0) < 1280

    await expect(tableButton).toContainText(tables[0].number)
    await dismissInstallDialog(page)

    // Cambio de mesa: la etiqueta debe cambiar antes de que vuelva la API.
    actionDelayMs = 900
    const rscBeforeTable = rscRequests.length

    if (compact) {
      await tableButton.dispatchEvent("click")
    } else {
      await tableButton.click()
    }
    const tableDialog = page.locator('[data-slot="dialog-content"]')

    await tableDialog
      .getByRole("button", {
        name: new RegExp(`^Mesa ${tables[1].number}(?:\\s|$)`),
      })
      .click()

    const tableRequestPromise = page.waitForRequest(isServerAction)
    await tableDialog
      .getByRole("button", { name: "Cambiar mesa" })
      .click()
    const tableRequest = await tableRequestPromise

    await expect(tableButton).toContainText(tables[1].number, {
      timeout: 400,
    })
    await tableRequest.response()
    expect(rscRequests.length).toBe(rscBeforeTable)

    // Clientes: el número y los chips se actualizan antes de la respuesta.
    const partyInput = page
      .locator('input[aria-label="Número de clientes"]:visible')
      .first()
    const rscBeforeParty = rscRequests.length
    const partyRequestPromise = page.waitForRequest(isServerAction)

    await partyInput.fill("3")
    await partyInput.press("Enter")
    const partyRequest = await partyRequestPromise

    await expect(partyInput).toHaveValue("3", { timeout: 400 })
    await expect(page.getByText(/Cliente 3/).first()).toBeVisible({
      timeout: 400,
    })
    await partyRequest.response()
    expect(rscRequests.length).toBe(rscBeforeParty)

    await expect(
      page.getByRole("button", { name: "Añadir un cliente" }).first()
    ).toBeEnabled({ timeout: 3_000 })

    const removeRequestPromise = page.waitForRequest(isServerAction)
    const removeButton = page
      .getByRole("button", { name: "Quitar un cliente" })
      .first()

    if (compact) {
      await removeButton.dispatchEvent("click")
    } else {
      await removeButton.click()
    }

    const removeRequest = await removeRequestPromise

    await expect(partyInput).toHaveValue("2", { timeout: 400 })
    await removeRequest.response()

    // Estado de ronda: cambia la etiqueta sin vaciar los artículos.
    actionDelayMs = 0
    const transition = await page.request.patch(
      `${API_URL}/orders/${order.id}/rounds/${round.id}/status`,
      {
        headers,
        data: { status: "PREPARING" },
      }
    )

    expect(transition.ok()).toBeTruthy()

    if (compact) {
      const closeComanda = page.getByRole("button", { name: "Cerrar comanda" })

      if (await closeComanda.isVisible().catch(() => false)) {
        await closeComanda.click()
      }
    }

    const updatedOrderResponse = await page.request.get(
      `${API_URL}/orders/${order.id}`,
      { headers }
    )
    expect(updatedOrderResponse.ok()).toBeTruthy()
    const updatedOrder = (await updatedOrderResponse.json()) as {
      rounds: Array<{ id: string; status: string }>
    }
    expect(
      updatedOrder.rounds.find((entry) => entry.id === round.id)?.status
    ).toBe("PREPARING")

    await page
      .getByRole("button", { name: /Cuentas abiertas/ })
      .first()
      .click()

    await expect(page.getByText("Cuentas abiertas").first()).toBeVisible()

    const accountsSheet = page.locator('[data-slot="sheet-content"]')
    await accountsSheet
      .getByRole("button", { name: "Cerrar" })
      .first()
      .click()

    if (compact) {
      await page.getByRole("button", { name: "Ver pedido actual" }).click()
    }

    await expect(page.getByText("En preparación").first()).toBeVisible({
      timeout: 3_000,
    })
    await expect(
      page.getByText(`2× ${PRODUCT_NAME}`).first()
    ).toBeVisible()
    await expect(
      page.getByText("Cargando artículos de la cuenta…")
    ).toHaveCount(0)

    // Enviar una ronda nueva no debe volver a pedir el catálogo ni la ruta.
    if (compact) {
      const closeComanda = page.getByRole("button", { name: "Cerrar comanda" })

      if (await closeComanda.isVisible().catch(() => false)) {
        await closeComanda.click()
      }
    }

    const search = page.getByRole("textbox", {
      name: "Buscar por nombre, categoría o grupo",
    })
    await search.fill(PRODUCT_NAME)
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

    if (compact) {
      await page.getByRole("button", { name: "Ver pedido actual" }).click()
    }

    const sendButton = page
      .getByRole("button", { name: "Enviar ronda" })
      .first()
    await expect(sendButton).toBeEnabled()

    const rscBeforeSend = rscRequests.length
    const sendRequestPromise = page.waitForRequest(isServerAction)
    await sendButton.click()
    const sendRequest = await sendRequestPromise
    await sendRequest.response()
    await page.waitForTimeout(800)
    expect(rscRequests.length).toBe(rscBeforeSend)
    await expect(page.getByText(/Ronda enviada/).first()).toBeVisible()

    const longTasks = await page.evaluate(() => window.__posLongTasks ?? [])
    const resourceMetrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType(
        "resource"
      ) as PerformanceResourceTiming[]
      const rsc = resources.filter((entry) => entry.name.includes("_rsc="))
      const navigation = performance.getEntriesByType(
        "navigation"
      )[0] as PerformanceNavigationTiming | undefined

      return {
        rscCount: rsc.length,
        rscTransferBytes: rsc.reduce(
          (sum, entry) => sum + (entry.transferSize ?? 0),
          0
        ),
        rscEncodedBytes: rsc.reduce(
          (sum, entry) => sum + (entry.encodedBodySize ?? 0),
          0
        ),
        navigationTransferBytes: navigation?.transferSize ?? 0,
        navigationEncodedBytes: navigation?.encodedBodySize ?? 0,
      }
    })
    const summarizeProfile = (commits: ProfilerCommit[]) =>
      ["PosView", "PosCatalog"].map((id) => {
        const entries = commits.filter((entry) => entry.id === id)
        const durations = entries.map((entry) => entry.actualDuration)

        return {
          id,
          commits: entries.length,
          maxCommitMs: durations.length > 0 ? Math.max(...durations) : 0,
          totalCommitMs:
            Math.round(durations.reduce((sum, value) => sum + value, 0) * 100) /
            100,
        }
      })
    const profileSummary = summarizeProfile(profilerCommits)
    const actionProfileSummary = summarizeProfile(
      profilerCommits.slice(actionProfilerStart)
    )

    const measurement = {
      profile: profileSummary,
      actionProfile: actionProfileSummary,
      longTasks: {
        count: longTasks.length,
        maxMs:
          longTasks.length > 0
            ? Math.round(Math.max(...longTasks) * 10) / 10
            : 0,
        totalMs:
          Math.round(longTasks.reduce((sum, value) => sum + value, 0) * 10) /
          10,
      },
      rsc: {
        actionRequests: rscRequests.length,
        ...resourceMetrics,
      },
    }

    console.log("POS MEASUREMENT", JSON.stringify(measurement))
    expect(profileSummary.every((entry) => entry.commits > 0)).toBe(true)
    expect(actionProfileSummary[0].commits).toBeGreaterThan(0)
  })

  test("matriz de canales sin recarga de ruta", async ({ page }) => {
    test.setTimeout(120_000)

    const productId = await findOrCreateProduct(page)
    const compact = (page.viewportSize()?.width ?? 0) < 1280
    await openRoute(page, "/pos")

    const rscRequests: string[] = []
    page.on("request", (request) => {
      if (request.url().includes("_rsc=")) rscRequests.push(request.url())
    })

    const channels = [
      {
        label: "Mostrador",
        data: { channel: "COUNTER", isTakeaway: true },
      },
      {
        label: "Teléfono",
        data: { channel: "PHONE", isTakeaway: true },
      },
      {
        label: "Domicilio",
        data: { channel: "DELIVERY", isTakeaway: true },
      },
    ] as const

    for (const channel of channels) {
      const customerName = `E2E ${channel.label} ${Date.now()}`
      const created = await page.request.post(`${API_URL}/orders`, {
        headers,
        data: {
          ...channel.data,
          customerName,
          customerPhone:
            channel.label === "Domicilio" || channel.label === "Teléfono"
              ? "5551234567"
              : undefined,
          deliveryAddress:
            channel.label === "Domicilio" ? "Calle E2E 123" : undefined,
          deliveryFee: channel.label === "Domicilio" ? 0 : undefined,
          idempotencyKey: `e2e-${channel.label}-${Date.now()}`,
        },
      })

      expect(created.ok()).toBeTruthy()
      const order = (await created.json()) as CreatedOrder
      matrixOrderIds.push(order.id)

      const roundResponse = await page.request.post(
        `${API_URL}/orders/${order.id}/rounds`,
        {
          headers,
          data: {
            items: [{ itemId: productId, quantity: 2 }],
            idempotencyKey: `e2e-${channel.label}-round-${Date.now()}`,
          },
        }
      )

      expect(roundResponse.ok()).toBeTruthy()
      const round = (await roundResponse.json()) as CreatedRound

      await page
        .getByRole("button", { name: /Cuentas abiertas/ })
        .first()
        .click()

      const accountRow = page
        .locator('[data-slot="item"]')
        .filter({ hasText: customerName })
        .first()

      await expect(accountRow).toBeVisible()
      await accountRow.getByRole("button", { name: "Ver comanda" }).click()
      await expect(
        page.getByText(`2× ${PRODUCT_NAME}`).first()
      ).toBeVisible()

      const transition = await page.request.patch(
        `${API_URL}/orders/${order.id}/rounds/${round.id}/status`,
        { headers, data: { status: "PREPARING" } }
      )
      expect(transition.ok()).toBeTruthy()

      if (compact) {
        const closeComanda = page.getByRole("button", {
          name: "Cerrar comanda",
        })

        if (await closeComanda.isVisible().catch(() => false)) {
          await closeComanda.click()
        }
      }

      const rscBeforeRefresh = rscRequests.length
      await page
        .getByRole("button", { name: /Cuentas abiertas/ })
        .first()
        .click()
      await expect(page.getByText("Cuentas abiertas").first()).toBeVisible()

      const accountsSheet = page.locator('[data-slot="sheet-content"]')
      await accountsSheet
        .getByRole("button", { name: "Cerrar" })
        .first()
        .click()

      if (compact) {
        await page.getByRole("button", { name: "Ver pedido actual" }).click()
      }

      await expect(page.getByText("En preparación").first()).toBeVisible()
      await expect(
        page.getByText(`2× ${PRODUCT_NAME}`).first()
      ).toBeVisible()
      await expect(
        page.getByText("Cargando artículos de la cuenta…")
      ).toHaveCount(0)
      expect(rscRequests.length).toBe(rscBeforeRefresh)

      if (compact) {
        const closeComanda = page.getByRole("button", {
          name: "Cerrar comanda",
        })

        if (await closeComanda.isVisible().catch(() => false)) {
          await closeComanda.click()
        }
      }
    }
  })
})
