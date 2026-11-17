"use server"

import { cookies } from "next/headers"

import { BRANCH_COOKIE } from "@/lib/api"
import type { UnitCode } from "@/lib/catalog"
import { CORE_PRODUCT_GROUPS } from "@/lib/core-products"
import { isSupportedCurrency } from "@/lib/currency-config"
import { mutateApi, type ActionResult } from "@/lib/server-api"
import { readApi } from "@/lib/server-api"

function text(formData: FormData, key: string): string | undefined {
  const value = formData.get(key)
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed === "" ? undefined : trimmed
}

/** Activa/desactiva todas las categorías core de inventario. */
export async function setCoreIngredientCategoriesActive(
  isActive: boolean
): Promise<ActionResult> {
  return mutateApi(
    "/inventory/ingredient-categories/bulk/core-status",
    "PATCH",
    { isActive },
    ["/settings", "/inventory"]
  )
}

/** Activa/desactiva la sección de insumos core sugeridos. */
export async function setUseCoreSuggestions(
  enabled: boolean
): Promise<ActionResult> {
  return mutateApi(
    "/organizations/current",
    "PATCH",
    { useCoreSuggestions: enabled },
    ["/settings", "/inventory"]
  )
}

/** Activa/desactiva todas las categorías core de un tipo. */
export async function setCoreCategoryGroupActive(
  kind: "ARTICLE" | "RECIPE",
  isActive: boolean
): Promise<ActionResult> {
  return mutateApi(
    "/catalog/categories/bulk/core-status",
    "PATCH",
    { kind, isActive },
    ["/settings", "/catalog"]
  )
}

/** Activa/desactiva los grupos de opciones core sugeridos. */
export async function setCoreOptionGroupsActive(
  isActive: boolean
): Promise<ActionResult> {
  return mutateApi(
    "/catalog/option-groups/core-status",
    "PATCH",
    { isActive },
    ["/settings", "/catalog"]
  )
}

/** Activa/desactiva el modo práctica (pausa la analítica de operación). */
export async function setPracticeMode(
  enabled: boolean
): Promise<ActionResult> {
  return mutateApi(
    "/organizations/current",
    "PATCH",
    { practiceMode: enabled },
    ["/settings", "/dashboard"]
  )
}

export interface OrganizationNameInput {
  name?: string
  domain?: string
}

export async function renameOrganization(
  input: OrganizationNameInput
): Promise<ActionResult> {
  const name = input.name?.trim()
  const domain = input.domain?.trim()

  if (name !== undefined && name.length < 2) {
    return { ok: false, message: "Escribe un nombre de al menos 2 caracteres." }
  }

  return mutateApi(
    "/organizations/current",
    "PATCH",
    {
      ...(name !== undefined ? { name } : {}),
      ...(domain !== undefined ? { domain } : {}),
    },
    ["/settings", "/dashboard"]
  )
}

/**
 * Cambia el IVA del negocio.
 *
 * Recibe la fracción (`0.16`), no el porcentaje: la conversión se hace en el
 * formulario para poder comparar contra el valor actual.
 */
export async function updateOrganizationTaxRate(
  taxRate: number
): Promise<ActionResult> {
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 1) {
    return { ok: false, message: "Escribe un IVA entre 0 y 100." }
  }

  return mutateApi(
    "/organizations/current",
    "PATCH",
    { taxRate },
    ["/settings", "/catalog", "/dashboard"]
  )
}

/**
 * Cambia la moneda del negocio (código ISO 4217).
 *
 * La validación real vive en la API; aquí se rechaza antes de llamarla para no
 * gastar una petición con una moneda que no existe.
 */
export async function setOrganizationCurrency(
  currency: string
): Promise<ActionResult> {
  if (!isSupportedCurrency(currency)) {
    return { ok: false, message: "Esa moneda no está disponible." }
  }

  return mutateApi(
    "/organizations/current",
    "PATCH",
    { currency },
    ["/settings", "/dashboard", "/catalog", "/reports", "/pos"]
  )
}

const BRANCH_PATHS = ["/settings", "/users"]

export interface CoreInventorySyncResult {
  created: string[]
  removed: string[]
  skipped: Array<{ name: string; reason: string }>
}

/**
 * Guarda en el inventario los insumos core seleccionados.
 *
 * El catálogo vive en el web; aquí se envía a la API qué insumos deben
 * existir y qué nombres del catálogo quedaron desmarcados. La API crea los
 * que faltan y desactiva los desmarcados solo si no tienen cambios.
 */
export async function saveCoreInventory(
  selectedNames: string[],
  createMissing = true
): Promise<ActionResult<CoreInventorySyncResult>> {
  const selected = new Set(selectedNames)
  const catalog = new Map<
    string,
    { name: string; displayUnit: UnitCode; category: string; location: string }
  >()

  // Un mismo nombre puede aparecer en dos categorías del catálogo; se manda
  // una sola vez para respetar la unicidad del insumo.
  for (const group of CORE_PRODUCT_GROUPS) {
    for (const product of group.products) {
      if (catalog.has(product.name)) continue

      catalog.set(product.name, {
        name: product.name,
        displayUnit: product.unit,
        category: group.category,
        location: product.location,
      })
    }
  }

  const products = createMissing
    ? [...selected]
        .filter((name) => catalog.has(name))
        .map((name) => catalog.get(name)!)
    : []

  const removeProducts = [...catalog.values()].filter(
    (product) => !selected.has(product.name)
  )

  return mutateApi<CoreInventorySyncResult>(
    "/inventory/ingredients/sync-core",
    "POST",
    { products, removeNames: [], removeProducts },
    ["/settings", "/inventory"]
  )
}

/** Crea una sucursal. El límite de uso justo se valida también en la API. */
export async function createBranch(
  formData: FormData
): Promise<ActionResult> {
  const name = text(formData, "name")

  if (!name || name.length < 2) {
    return { ok: false, message: "Escribe el nombre de la sucursal." }
  }

  return mutateApi(
    "/branches",
    "POST",
    {
      name,
      address: text(formData, "address") ?? "",
      phone: text(formData, "phone") ?? "",
      defaultTipPercent: Number(formData.get("defaultTipPercent") ?? 0),
    },
    BRANCH_PATHS
  )
}

/** Actualiza solo los campos enviados de una sucursal. */
export interface BranchUpdateInput {
  name?: string
  address?: string
  phone?: string
  defaultTipPercent?: number
  isActive?: boolean
}

export async function updateBranch(
  id: string,
  input: Partial<BranchUpdateInput>
): Promise<ActionResult> {
  if (!id) {
    return { ok: false, message: "Sucursal no encontrada." }
  }

  const name = input.name?.trim()

  if (name !== undefined && name.length < 2) {
    return { ok: false, message: "Escribe el nombre de la sucursal." }
  }

  return mutateApi(
    `/branches/${id}`,
    "PATCH",
    {
      ...input,
      ...(name !== undefined ? { name } : {}),
    },
    BRANCH_PATHS
  )
}

/** Activa o desactiva una sucursal (no se borra para conservar historial). */
export async function setBranchActive(
  formData: FormData
): Promise<ActionResult> {
  const id = text(formData, "id")
  const isActive = formData.get("isActive") === "true"

  if (!id) {
    return { ok: false, message: "Sucursal no encontrada." }
  }

  const result = await mutateApi(
    `/branches/${id}`,
    "PATCH",
    { isActive },
    BRANCH_PATHS
  )

  // Si se desactiva la sucursal en la que estaba trabajando la sesión, se
  // vuelve a la vista consolidada para no dejar la cookie apuntando a un local
  // inactivo (la API rechazaría todas las peticiones de negocio).
  if (result.ok && !isActive) {
    const store = await cookies()

    if (store.get(BRANCH_COOKIE)?.value === id) {
      store.delete(BRANCH_COOKIE)
    }
  }

  return result
}

/**
 * Actualiza la configuración de cocina.
 *
 * Recibe solo los campos que cambiaron: la tarjeta calcula el diff y no llama
 * a la API si no hay nada nuevo.
 */
export async function updateKitchenSettings(input: {
  prepMinutes?: number
  source?: "MANUAL" | "HISTORICAL"
  suggestOrder?: boolean
}): Promise<ActionResult> {
  if (Object.keys(input).length === 0) {
    return { ok: true }
  }

  return mutateApi("/kitchen/settings", "PATCH", input, [
    "/settings",
    "/kitchen",
  ])
}

export interface OrganizationBrandingInput {
  brandColor?: string | null
  logoUrl?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
}

export interface LocationSearchResult {
  label: string
  latitude: number
  longitude: number
  type: string | null
}

/** Busca direcciones reales (OpenStreetMap) para ubicar el negocio. */
export async function searchOrganizationLocation(
  query: string
): Promise<ActionResult<LocationSearchResult[]>> {
  return readApi(
    `/organizations/location-search?q=${encodeURIComponent(query.trim())}`
  )
}

/**
 * Marca blanca y ubicación del negocio.
 *
 * Recibe solo lo que cambió (la tarjeta calcula el diff). Si llega un valor
 * vacío se envía `null` para limpiar la columna.
 */
export async function updateOrganizationBranding(
  input: OrganizationBrandingInput
): Promise<ActionResult> {
  const payload: Record<string, unknown> = {}

  if (input.brandColor !== undefined) {
    const color = input.brandColor?.trim() || null
    if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
      return { ok: false, message: "El color debe tener el formato #rrggbb." }
    }
    payload.brandColor = color
  }

  if (input.logoUrl !== undefined) {
    const url = input.logoUrl?.trim() || null
    if (url && !/^https:\/\/\S+$/.test(url)) {
      return { ok: false, message: "El logo debe ser una URL https." }
    }
    payload.logoUrl = url
  }

  if (input.address !== undefined) {
    payload.address = input.address?.trim() || null
  }

  if (input.latitude !== undefined) {
    payload.latitude = input.latitude
  }

  if (input.longitude !== undefined) {
    payload.longitude = input.longitude
  }

  return mutateApi("/organizations/current", "PATCH", payload, [
    "/settings",
    "/dashboard",
  ])
}

export interface CustomDomainInstructions {
  domain: string
  status: "pending" | "verified"
  verifiedAt: string | null
  cname: { name: string; value: string }
  txt: { name: string; value: string }
}

export interface CustomDomainCheck {
  verified: boolean
  checks: { txt: boolean; cname: boolean }
}

/** Conecta un dominio propio. Queda pendiente hasta verificar el DNS. */
export async function connectCustomDomain(
  domain: string
): Promise<ActionResult<CustomDomainInstructions>> {
  const value = domain.trim().toLowerCase()

  if (!value.includes(".")) {
    return { ok: false, message: "Escribe un dominio válido, por ejemplo app.micafeteria.com" }
  }

  return mutateApi<CustomDomainInstructions>(
    "/organizations/domain",
    "PUT",
    { domain: value },
    ["/settings"]
  )
}

/** Consulta el DNS real y marca el dominio como verificado si coincide. */
export async function verifyCustomDomain(): Promise<
  ActionResult<CustomDomainCheck>
> {
  return mutateApi<CustomDomainCheck>(
    "/organizations/domain/verify",
    "POST",
    undefined,
    ["/settings"]
  )
}

/** Desconecta el dominio y borra el token. */
export async function removeCustomDomain(): Promise<ActionResult> {
  return mutateApi("/organizations/domain", "DELETE", undefined, ["/settings"])
}

/** Cambia la dirección del negocio (una sola vez después del onboarding). */
export async function changeOrganizationSlug(
  slug: string
): Promise<ActionResult<{ slug: string; slugChanges: number }>> {
  return mutateApi<{ slug: string; slugChanges: number }>(
    "/organizations/slug",
    "PATCH",
    { slug },
    ["/settings", "/dashboard"]
  )
}
