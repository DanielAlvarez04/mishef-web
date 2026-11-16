import { cache } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

/**
 * Resolución del negocio a partir del subdominio.
 *
 * El `middleware.ts` lee el `Host` y deja el slug en la cabecera `x-tenant`.
 * Aquí solo se consume: las páginas no tienen que saber nada de dominios.
 */

export interface TenantInfo {
  name: string
  slug: string
  /** Dirección usada en la petición; si difiere de `slug`, se redirige. */
  requestedSlug?: string
  brandColor: string | null
  logoUrl: string | null
  address: string | null
  latitude: string | null
  longitude: string | null
}

/** Dominio base de los negocios. */
const TENANT_DOMAIN = process.env.NEXT_PUBLIC_TENANT_DOMAIN ?? "mishef.co"

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

/** Dominio propio de la petición (no es un subdominio de Mishef). */
export async function getTenantDomain(): Promise<string | null> {
  const requestHeaders = await headers()
  const domain = requestHeaders.get("x-tenant-domain")?.trim().toLowerCase()
  return domain || null
}

/**
 * Datos públicos del negocio. `cache` evita repetir la consulta cuando la
 * misma página la usa en varios componentes.
 */
export const getTenant = cache(async (): Promise<TenantInfo | null> => {
  const requestHeaders = await headers()
  const slug = await getTenantSlug()
  const host = requestHeaders.get("x-tenant-domain")?.trim().toLowerCase()

  if (!slug && !host) return null

  try {
    const path = slug
      ? `/public/tenant/${encodeURIComponent(slug)}`
      : `/public/tenant-by-domain?host=${encodeURIComponent(host ?? "")}`

    const response = await fetch(`${SERVER_API_URL}${path}`, {
      cache: "no-store",
    })

    if (!response.ok) return null

    const data = (await response.json()) as TenantInfo

    // El negocio cambió de dirección: se redirige 301 al host nuevo
    // conservando la ruta, para que los QR y enlaces viejos sigan sirviendo.
    if (slug && data.requestedSlug && data.requestedSlug !== data.slug) {
      const path = requestHeaders.get("x-pathname") ?? "/"
      redirect(`https://${data.slug}.${TENANT_DOMAIN}${path}`)
    }

    return data?.slug ? data : null
  } catch {
    return null
  }
})
