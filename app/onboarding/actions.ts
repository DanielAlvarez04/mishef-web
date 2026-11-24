"use server"

import { headers } from "next/headers"

import { isSupportedCurrency } from "@/lib/currency-config"
import { mutateApi, readApi, type ActionResult } from "@/lib/server-api"

function text(formData: FormData, key: string): string | undefined {
  const value = formData.get(key)
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed === "" ? undefined : trimmed
}

function textArray(formData: FormData, key: string): string[] {
  const value = formData.get(key)
  if (typeof value !== "string") return []
  return value.split(",").map((v) => v.trim()).filter(Boolean)
}

/** Paso 1: giro principal del negocio. */
export async function updateOnboardingBusinessType(
  formData: FormData
): Promise<ActionResult> {
  const businessType = text(formData, "businessType")

  if (!businessType) {
    return { ok: false, message: "Selecciona el giro principal de tu negocio." }
  }

  return mutateApi(
    "/organizations/current",
    "PATCH",
    { businessType },
    ["/onboarding", "/dashboard", "/settings"]
  )
}

/** Paso 2: datos del negocio (nombre y primera sucursal). */
export async function updateOnboardingBusiness(
  formData: FormData
): Promise<ActionResult> {
  const name = text(formData, "name")
  const branchName = text(formData, "branchName")
  const hasBranches = formData.get("hasBranches") === "true"

  if (!name || name.length < 2) {
    return { ok: false, message: "Escribe el nombre de tu negocio." }
  }

  if (!branchName || branchName.length < 2) {
    return { ok: false, message: "Escribe el nombre de tu primera sucursal." }
  }

  const updated = await mutateApi(
    "/organizations/current",
    "PATCH",
    { name, hasBranches },
    ["/onboarding", "/dashboard", "/settings"]
  )

  if (!updated.ok) return updated

  // La primera sucursal se crea una sola vez: si el usuario reintenta el paso,
  // ya existe y no se duplica. Si la lectura falla, se devuelve el error para
  // no completar el paso sin sucursal.
  const branches = await readApi<Array<{ id: string }>>("/branches")

  if (!branches.ok) return branches

  if ((branches.data ?? []).length === 0) {
    const created = await mutateApi(
      "/branches",
      "POST",
      { name: branchName },
      ["/onboarding", "/dashboard", "/settings"]
    )

    if (!created.ok) return created
  }

  return updated
}

/** Paso de dirección: disponibilidad y sugerencia del subdominio. */
export async function suggestOnboardingSlug(name: string) {
  return readApi<{ slug: string; available: boolean }>(
    `/public/slug-suggestion?name=${encodeURIComponent(name.trim())}`
  )
}

export async function checkOnboardingSlug(slug: string) {
  return readApi<{
    slug: string
    available: boolean
    reason?: "taken" | "invalid" | "reserved"
  }>(`/public/slug-available?slug=${encodeURIComponent(slug.trim())}`)
}

export async function updateOnboardingSlug(slug: string): Promise<ActionResult> {
  if (!slug.trim()) {
    return { ok: false, message: "Elige una dirección para tu negocio." }
  }

  return mutateApi(
    "/organizations/slug",
    "PATCH",
    { slug: slug.trim() },
    ["/onboarding", "/dashboard", "/settings"]
  )
}

/** Paso 3: moneda del negocio (MXN o USD). */
export async function updateOnboardingCurrency(
  formData: FormData
): Promise<ActionResult> {
  const currency = text(formData, "currency")

  if (!currency) {
    return { ok: false, message: "Selecciona la moneda de tu negocio." }
  }

  if (!isSupportedCurrency(currency)) {
    return { ok: false, message: "Esa moneda no está disponible." }
  }

  return mutateApi(
    "/organizations/current",
    "PATCH",
    { currency },
    ["/onboarding", "/dashboard", "/settings"]
  )
}

/** Paso 4: datos del usuario (nombre, apellido, usuario). */
export async function updateOnboardingProfile(
  formData: FormData
): Promise<ActionResult> {
  const firstName = text(formData, "firstName")
  const lastName = text(formData, "lastName")
  const username = text(formData, "username")

  if (!firstName) {
    return { ok: false, message: "Escribe tu nombre." }
  }

  if (!lastName) {
    return { ok: false, message: "Escribe tu apellido." }
  }

  if (!username) {
    return { ok: false, message: "Elige un nombre de usuario." }
  }

  const fullName = `${firstName} ${lastName}`.trim()

  return mutateApi(
    "/auth/me",
    "PATCH",
    { name: fullName, username },
    ["/onboarding"]
  )
}

/** Paso 5: tipo de servicio (skippable, multiple). */
export async function updateOnboardingServiceTypes(
  formData: FormData
): Promise<ActionResult> {
  const serviceTypes = textArray(formData, "serviceTypes")

  return mutateApi(
    "/organizations/current",
    "PATCH",
    { serviceTypes },
    ["/onboarding", "/dashboard", "/settings"]
  )
}

/** Paso 6: objetivos del negocio (skippable, multiple). */
export async function updateOnboardingGoals(
  formData: FormData
): Promise<ActionResult> {
  const goals = textArray(formData, "goals")

  return mutateApi(
    "/organizations/current",
    "PATCH",
    { goals },
    ["/onboarding", "/dashboard", "/settings"]
  )
}

/** Paso final: fija el subdominio y marca el onboarding como completado. */
export async function finishOnboarding(
  requestedSlug?: string,
  branchName?: string
): Promise<ActionResult<{ redirectTo: string }>> {
  const completed = await mutateApi(
    "/auth/onboarding/complete",
    "POST",
    {
      slug: requestedSlug?.trim() || undefined,
      branchName: branchName?.trim() || undefined,
    },
    ["/onboarding", "/dashboard"]
  )

  if (!completed.ok) {
    return completed as ActionResult<{ redirectTo: string }>
  }

  const me = await readApi<{
    organizationSlug?: string | null
    organization?: { slug?: string | null } | null
  }>("/auth/me")

  const slug =
    me.ok && me.data
      ? (me.data.organizationSlug ?? me.data.organization?.slug ?? null)
      : null

  const requestHeaders = await headers()
  const host = (
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    ""
  )
    .split(":")[0]
    .trim()
    .toLowerCase()
  const configuredBase = (
    process.env.NEXT_PUBLIC_TENANT_DOMAIN ?? "mishef.co"
  )
    .trim()
    .toLowerCase()
  const baseDomain = host.startsWith("app.")
    ? host.slice(4)
    : host.startsWith("www.")
      ? host.slice(4)
      : configuredBase
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".local") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host)

  if (!slug || isLocal) {
    return { ok: true, data: { redirectTo: "/dashboard" } }
  }

  const alreadyOnTenant = host === `${slug}.${baseDomain}`

  return {
    ok: true,
    data: {
      redirectTo: alreadyOnTenant
        ? "/dashboard"
        : `https://${slug}.${baseDomain}/dashboard`,
    },
  }
}