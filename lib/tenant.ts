import { cache } from "react"
import { headers } from "next/headers"

/**
 * Resolución del negocio a partir del subdominio.
 *
 * El `middleware.ts` lee el `Host` y deja el slug en la cabecera `x-tenant`.
 * Aquí solo se consume: las páginas no tienen que saber nada de dominios.
 */

export interface TenantInfo {
  name: string
  slug: string
  brandColor: string | null
  logoUrl: string | null
  address: string | null
  latitude: string | null
  longitude: string | null
}

const SERVER_API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001/v1"

/** Slug del negocio de la petición actual, o `null` en el dominio principal. */
export async function getTenantSlug(): Promise<string | null> {
  const requestHeaders = await headers()
  const slug = requestHeaders.get("x-tenant")?.trim().toLowerCase()
  return slug || null
}

/**
 * Datos públicos del negocio. `cache` evita repetir la consulta cuando la
 * misma página la usa en varios componentes.
 */
export const getTenant = cache(async (): Promise<TenantInfo | null> => {
  const slug = await getTenantSlug()
  if (!slug) return null

  try {
    const response = await fetch(
      `${SERVER_API_URL}/public/tenant/${encodeURIComponent(slug)}`,
      { cache: "no-store" }
    )

    if (!response.ok) return null

    const data = (await response.json()) as TenantInfo
    return data?.slug ? data : null
  } catch {
    return null
  }
})
