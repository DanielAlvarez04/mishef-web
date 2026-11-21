import { headers } from "next/headers"

const CONFIGURED_BASE = (
  process.env.NEXT_PUBLIC_TENANT_DOMAIN ?? "mishef.co"
)
  .trim()
  .toLowerCase()

function isLocalHost(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".local") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host)
  )
}

async function requestHost(): Promise<{
  host: string
  protocol: string
}> {
  const requestHeaders = await headers()
  const rawHost = (
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    ""
  )
    .split(",")[0]
    .trim()
  const protocol =
    requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim() ?? "https"

  return { host: rawHost, protocol }
}

/** Origen del host actual; cadena vacía en local para usar rutas relativas. */
export async function currentOrigin(): Promise<string> {
  const { host, protocol } = await requestHost()
  const hostname = host.split(":")[0].toLowerCase()

  if (!hostname || isLocalHost(hostname)) return ""

  return `${protocol}://${host}`
}

/** Origen del panel principal (`app.mishef.co`), no del subdominio actual. */
export async function mainAppOrigin(): Promise<string> {
  const configured = process.env.WEB_ORIGIN?.trim().replace(/\/$/, "")
  const { host, protocol } = await requestHost()
  const hostname = host.split(":")[0].toLowerCase()

  if (!hostname || isLocalHost(hostname)) return ""

  if (configured) {
    try {
      const configuredUrl = new URL(configured)
      const configuredHost = configuredUrl.hostname.toLowerCase()

      if (!isLocalHost(configuredHost)) {
        const appHost =
          configuredHost === CONFIGURED_BASE ||
          configuredHost === `www.${CONFIGURED_BASE}`
            ? `app.${CONFIGURED_BASE}`
            : configuredHost

        return `${configuredUrl.protocol}//${appHost}`
      }
    } catch {
      // Configuración inválida: se usa app.{dominio}.
    }
  }

  return `${protocol}://app.${CONFIGURED_BASE}`
}

/** URL absoluta del dashboard de un negocio. */
export async function tenantDashboardUrl(slug: string): Promise<string> {
  const origin = await mainAppOrigin()

  if (!origin) return "/dashboard"

  const configuredHost = new URL(origin).hostname.toLowerCase()
  const base = configuredHost.startsWith("app.")
    ? configuredHost.slice(4)
    : CONFIGURED_BASE

  return `https://${slug}.${base}/dashboard`
}
