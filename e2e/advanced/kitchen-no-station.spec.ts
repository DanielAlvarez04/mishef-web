import { expect, test, type Browser, type Page } from "@playwright/test"

/**
 * KITCHEN sin estación: la cuenta puede entrar a cocina, pero no ve la
 * configuración ni tickets de estación porque no tiene posición de brigada ni
 * asignaciones.
 *
 * El usuario se crea/resetea con la sesión ADMIN de la suite. Como las cuentas
 * que no son dueñas no pueden iniciar sesión desde el dominio principal, el
 * login se hace contra la API con `tenant` y las cookies se inyectan en un
 * contexto aislado.
 */

const KITCHEN_USERNAME = "e2e-kitchen"
const INITIAL_PASSWORD = "E2EKitchen123!"
const FINAL_PASSWORD = "E2EKitchen456!"
const API_URL = process.env.E2E_API_URL ?? "http://localhost:3001/v1"
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000"
const ORIGIN = { Origin: BASE_URL }

interface UserRow {
  id: string
  username: string | null
}

interface BranchRow {
  id: string
  isActive: boolean
}

interface ModeResponse {
  mode: "GENERAL" | "ADVANCED"
}

interface MeResponse {
  roles: string[]
  mustChangePassword: boolean
  organizationSlug: string
}

async function adminRequest(
  page: Page,
  path: string,
  init?: { method?: string; data?: unknown }
) {
  return page.request.fetch(`${API_URL}${path}`, {
    method: init?.method ?? "GET",
    headers: ORIGIN,
    data: init?.data,
  })
}

async function findUser(page: Page): Promise<UserRow | null> {
  const response = await adminRequest(page, "/users")
  expect(response.ok()).toBeTruthy()

  const users = (await response.json()) as UserRow[]
  return users.find((user) => user.username === KITCHEN_USERNAME) ?? null
}

async function ensureKitchenUser(page: Page) {
  const branchesResponse = await adminRequest(page, "/branches")
  expect(branchesResponse.ok()).toBeTruthy()

  const branches = (await branchesResponse.json()) as BranchRow[]
  const branchId = branches.find((branch) => branch.isActive)?.id ?? ""

  const existing = await findUser(page)

  if (existing) {
    const response = await adminRequest(page, `/users/${existing.id}`, {
      method: "PATCH",
      data: {
        name: "E2E Cocina",
        password: INITIAL_PASSWORD,
        roles: ["KITCHEN"],
        isActive: true,
        branchId,
      },
    })
    expect(response.ok()).toBeTruthy()
    return existing.id
  }

  const created = await adminRequest(page, "/users", {
    method: "POST",
    data: {
      username: KITCHEN_USERNAME,
      name: "E2E Cocina",
      password: INITIAL_PASSWORD,
      roles: ["KITCHEN"],
      branchId,
    },
  })

  expect(created.ok()).toBeTruthy()
  return ((await created.json()) as { id: string }).id
}

async function loginKitchen(browser: Browser, tenant: string) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: 1440, height: 900 },
  })

  const initialLogin = await context.request.post(`${API_URL}/auth/login`, {
    headers: ORIGIN,
    data: {
      identifier: KITCHEN_USERNAME,
      password: INITIAL_PASSWORD,
      tenant,
    },
  })
  expect(initialLogin.ok()).toBeTruthy()

  const change = await context.request.post(
    `${API_URL}/auth/change-password`,
    {
      headers: ORIGIN,
      data: {
        currentPassword: INITIAL_PASSWORD,
        newPassword: FINAL_PASSWORD,
      },
    }
  )
  expect(change.ok()).toBeTruthy()

  const finalLogin = await context.request.post(`${API_URL}/auth/login`, {
    headers: ORIGIN,
    data: {
      identifier: KITCHEN_USERNAME,
      password: FINAL_PASSWORD,
      tenant,
    },
  })
  expect(finalLogin.ok()).toBeTruthy()

  return context
}

test.describe("cocina avanzada", () => {
  test("KITCHEN sin estación no ve configuración ni tickets", async ({
    browser,
    page,
  }) => {
    await ensureKitchenUser(page)

    const meResponse = await adminRequest(page, "/auth/me")
    expect(meResponse.ok()).toBeTruthy()
    const admin = (await meResponse.json()) as MeResponse

    const modeResponse = await adminRequest(page, "/kitchen/mode")
    expect(modeResponse.ok()).toBeTruthy()
    const initialMode = ((await modeResponse.json()) as ModeResponse).mode

    const advanced = await adminRequest(page, "/kitchen/mode", {
      method: "PATCH",
      data: { mode: "ADVANCED" },
    })
    expect(advanced.ok()).toBeTruthy()

    const context = await loginKitchen(browser, admin.organizationSlug)

    try {
      const sessionResponse = await context.request.get(`${API_URL}/auth/me`, {
        headers: ORIGIN,
      })
      expect(sessionResponse.ok()).toBeTruthy()
      const kitchen = (await sessionResponse.json()) as MeResponse
      expect(kitchen.roles).toEqual(["KITCHEN"])
      expect(kitchen.mustChangePassword).toBe(false)

      const configResponse = await context.request.get(
        `${API_URL}/kitchen/config`,
        { headers: ORIGIN }
      )
      expect(configResponse.status()).toBe(403)

      const boardResponse = await context.request.get(
        `${API_URL}/kitchen/tickets`,
        { headers: ORIGIN }
      )
      expect(boardResponse.ok()).toBeTruthy()
      const board = (await boardResponse.json()) as {
        mode: string
        stations: unknown[]
        tickets: unknown[]
        recentTickets: unknown[]
      }
      expect(board.mode).toBe("ADVANCED")
      expect(board.stations).toHaveLength(0)
      expect(board.tickets).toHaveLength(0)
      expect(board.recentTickets).toHaveLength(0)

      const kitchenPage = await context.newPage()

      await kitchenPage.goto("/kitchen")
      await expect(
        kitchenPage.locator('[data-slot="sidebar-inset"]')
      ).toBeVisible()
      await expect(kitchenPage.getByText(/modo Avanzado/)).toBeVisible()
      await expect(
        kitchenPage.getByText(/No hay estaciones activas/)
      ).toBeVisible()
      await expect(
        kitchenPage.getByRole("heading", { name: "A E2E Parrilla" })
      ).toHaveCount(0)
      await expect(kitchenPage.getByText("E2E Hamburguesa")).toHaveCount(0)

      await kitchenPage.goto("/settings")
      await expect(
        kitchenPage.locator('[data-slot="sidebar-inset"]')
      ).toBeVisible()
      await expect(
        kitchenPage.getByRole("tab", { name: "Cuenta", exact: true })
      ).toBeVisible()
      await expect(
        kitchenPage.getByRole("tab", { name: "Cocina", exact: true })
      ).toHaveCount(0)
      await expect(kitchenPage.locator("#kitchen-mode")).toHaveCount(0)
    } finally {
      await adminRequest(page, "/kitchen/mode", {
        method: "PATCH",
        data: { mode: initialMode },
      })
      await context.close()
    }
  })
})
