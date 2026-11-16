import { NextResponse, type NextRequest } from "next/server"

const ACCESS_TOKEN_COOKIE = "np_at"
const REFRESH_TOKEN_COOKIE = "np_rt"
/** Evita que varias peticiones renueven la sesión a la vez. */
const REFRESH_LOCK_COOKIE = "np_rl"
/** Se renueva el access token cuando le quedan menos de 2 minutos. */
const REFRESH_LEEWAY_MS = 2 * 60 * 1000
const RETRY_PARAM = "_session_retry"

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/pair",
  "/pos/unlock",
  "/display",
]

const API_BASE_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001/v1"

const WEB_ORIGIN =
  process.env.WEB_ORIGIN ??
  process.env.NEXT_PUBLIC_WEB_ORIGIN ??
  "http://localhost:3000"

/** `exp` del JWT en milisegundos, o `null` si no se pudo analizar. */
function jwtExpiryMs(token: string): number | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    // Convertir base64url a base64 estándar (compatible Edge + Node)
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const json =
      typeof atob === "function"
        ? atob(base64)
        : Buffer.from(base64, "base64").toString("utf8")
    const data = JSON.parse(json) as { exp?: number }
    return data.exp ? data.exp * 1000 : null
  } catch {
    return null
  }
}

function isJwtExpired(token: string): boolean {
  const expiry = jwtExpiryMs(token)
  return expiry === null || expiry <= Date.now()
}

/**
 * Cabeceras `Set-Cookie` de una respuesta.
 *
 * `getSetCookie` existe en Node 18+ y en los runtimes modernos; el fallback
 * separa por comas solo cuando empieza un nuevo `nombre=`.
 */
function readSetCookies(headers: Headers): string[] {
  const withGetter = headers as Headers & { getSetCookie?: () => string[] }
  if (typeof withGetter.getSetCookie === "function") {
    return withGetter.getSetCookie()
  }

  const raw = headers.get("set-cookie")
  if (!raw) return []

  return raw
    .split(/,(?=[^;,]+=)/)
    .map((cookie) => cookie.trim())
    .filter(Boolean)
}

function cookiePair(setCookie: string): { name: string; value: string } | null {
  const [pair] = setCookie.split(";")
  const index = pair.indexOf("=")
  if (index <= 0) return null

  return {
    name: pair.slice(0, index).trim(),
    value: pair.slice(index + 1).trim(),
  }
}

/**
 * Copia las cookies renovadas a la petición (para que este mismo render use el
 * token nuevo) y a la respuesta (para que el navegador las guarde).
 *
 * `request.cookies.set()` no reescribe la cabecera `cookie`, así que se
 * reconstruye a mano y se pasa a `NextResponse.next`.
 */
function withSessionCookies(
  request: NextRequest,
  setCookies: string[]
): NextResponse {
  const cookies = request.cookies.getAll()

  for (const raw of setCookies) {
    const cookie = cookiePair(raw)
    if (!cookie) continue

    const index = cookies.findIndex((item) => item.name === cookie.name)
    if (index >= 0) {
      cookies[index] = { name: cookie.name, value: cookie.value }
    } else {
      cookies.push({ name: cookie.name, value: cookie.value })
    }
  }

  const headers = new Headers(request.headers)
  headers.set(
    "cookie",
    cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ")
  )

  const response = pass(request, headers);
  for (const raw of setCookies) {
    response.headers.append("set-cookie", raw)
  }

  return response
}

function lockRefresh(response: NextResponse): NextResponse {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
  response.headers.append(
    "set-cookie",
    `${REFRESH_LOCK_COOKIE}=1; Path=/; Max-Age=15; HttpOnly; SameSite=Lax${secure}`
  )

  return response
}

/**
 * Resolución del negocio por dominio.
 *
 * `micafeteria.mishef.co`  → cabecera `x-tenant: micafeteria`
 * `app.mishef.co`          → sin cabecera (panel de la cuenta)
 *
 * No consulta la base: solo extrae el slug. La API valida que exista cuando la
 * página pide sus datos.
 */
const TENANT_HEADER = "x-tenant";
/** Dominio propio (`app.micafeteria.com`) cuando no es un subdominio de Mishef. */
const TENANT_DOMAIN_HEADER = "x-tenant-domain";

const BASE_DOMAIN = (
  process.env.NEXT_PUBLIC_TENANT_DOMAIN ?? "mishef.co"
)
  .trim()
  .toLowerCase();

/** Subdominios de infraestructura: nunca son de un negocio. */
const RESERVED_SUBDOMAINS = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "cdn",
  "dokploy",
  "docs",
  "img",
  "mail",
  "static",
  "status",
  "support",
  "www",
]);

function tenantFromHost(host: string): string | null {
  if (host === BASE_DOMAIN || host === `www.${BASE_DOMAIN}`) return null;

  const suffix = `.${BASE_DOMAIN}`;
  if (!host.endsWith(suffix)) return null;

  const sub = host.slice(0, -suffix.length);
  if (!sub || sub.includes(".")) return null;
  if (RESERVED_SUBDOMAINS.has(sub)) return null;

  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sub) ? sub : null;
}

function tenantOf(request: NextRequest): string | null {
  const host = (request.headers.get("host") ?? "")
    .split(":")[0]
    .trim()
    .toLowerCase();

  return tenantFromHost(host);
}

/** Host público que no es ni el dominio base ni un subdominio suyo. */
function customDomainOf(request: NextRequest): string | null {
  const host = (request.headers.get("host") ?? "")
    .split(":")[0]
    .trim()
    .toLowerCase()

  if (!host || host === BASE_DOMAIN) return null
  if (host.endsWith(`.${BASE_DOMAIN}`)) return null
  // Desarrollo local y hosts internos: no son dominios de un negocio.
  if (host === "localhost" || host.endsWith(".local") || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return null
  }
  // Solo nombres con al menos un punto (`app.micafeteria.com`).
  return host.includes(".") ? host : null
}

/**
 * `NextResponse.next` con el negocio resuelto.
 *
 * Todas las salidas que renderizan pasan por aquí; si no, una página de
 * subdominio no vería la cabecera `x-tenant`.
 */
function pass(request: NextRequest, headers?: Headers): NextResponse {
  const next = headers ? new Headers(headers) : new Headers(request.headers);
  const slug = tenantOf(request);
  const customDomain = customDomainOf(request);

  if (slug) {
    next.set(TENANT_HEADER, slug);
  } else {
    next.delete(TENANT_HEADER);
  }

  // Dominio propio: la página lo resuelve contra la API (solo si está
  // verificado). El middleware no consulta la base para no añadir latencia a
  // cada petición.
  if (!slug && customDomain) {
    next.set(TENANT_DOMAIN_HEADER, customDomain);
  } else {
    next.delete(TENANT_DOMAIN_HEADER);
  }

  return NextResponse.next({ request: { headers: next } });
}

function redirectToLogin(request: NextRequest): NextResponse {
  // Una caja vinculada por QR entra con PIN en lugar de contraseña.
  const hasDevice = Boolean(request.cookies.get("np_pos_device")?.value)
  const response = NextResponse.redirect(
    new URL(hasDevice ? "/pos/unlock" : "/login", request.url)
  )
  response.cookies.delete(ACCESS_TOKEN_COOKIE)
  response.cookies.delete(REFRESH_TOKEN_COOKIE)
  return response
}

interface RefreshResult {
  ok: boolean
  setCookies: string[]
  rotatedElsewhere: boolean
}

/**
 * Un JWT puede seguir sin expirar aunque su sesión ya no exista (logout,
 * revocación o limpieza de sesiones). Si el middleware redirige a /dashboard
 * solo por la fecha `exp`, el layout vuelve a /login y se produce un bucle
 * ERR_TOO_MANY_REDIRECTS. Se valida contra la API.
 */
async function accessTokenIsValid(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { cookie: `${ACCESS_TOKEN_COOKIE}=${accessToken}` },
      cache: "no-store",
    })

    return response.ok
  } catch {
    return false
  }
}

async function refreshSession(refreshToken: string): Promise<RefreshResult> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // La API exige un origen de confianza en toda mutación autenticada por
      // cookies (CSRF). Sin esta cabecera el refresh devuelve 403.
      origin: WEB_ORIGIN,
      cookie: `${REFRESH_TOKEN_COOKIE}=${refreshToken}`,
    },
    cache: "no-store",
  })

  const body = await response.text().catch(() => "")

  return {
    ok: response.ok,
    setCookies: readSetCookies(response.headers),
    rotatedElsewhere: body.includes("SESSION_ROTATED"),
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ignorar assets estáticos y rutas internas de Next.js
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return pass(request)
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value

  // Rutas públicas: si hay una sesión válida se entra directo al dashboard;
  // si el token está vigente pero la sesión ya no existe, se limpian las
  // cookies y se deja ver el formulario (evita el bucle de redirecciones).
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )

  if (isPublic) {
    // La pantalla del cliente se abre en un monitor sin sesión y nunca debe
    // redirigirse al panel.
    if (pathname.startsWith("/display")) {
      return pass(request)
    }

    if (!accessToken || isJwtExpired(accessToken)) {
      return pass(request)
    }

    if (await accessTokenIsValid(accessToken)) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    const response = pass(request)
    response.cookies.delete(ACCESS_TOKEN_COOKIE)
    response.cookies.delete(REFRESH_TOKEN_COOKIE)
    return response
  }

  if (!accessToken && !refreshToken) {
    return redirectToLogin(request)
  }

  const expiry = accessToken ? jwtExpiryMs(accessToken) : null
  const expiresSoon =
    expiry === null || expiry - Date.now() <= REFRESH_LEEWAY_MS
  const refreshLocked = request.cookies.get(REFRESH_LOCK_COOKIE)?.value === "1"

  // Token todavía válido y fuera de la ventana de renovación: nada que hacer.
  if (accessToken && !expiresSoon) {
    return pass(request)
  }

  // Otra petición está renovando y el token actual aún sirve: se deja pasar
  // para no competir por la rotación del refresh token.
  if (
    refreshToken &&
    refreshLocked &&
    accessToken &&
    !isJwtExpired(accessToken)
  ) {
    return pass(request)
  }

  if (!refreshToken) {
    return redirectToLogin(request)
  }

  try {
    const result = await refreshSession(refreshToken)

    if (result.ok) {
      return lockRefresh(withSessionCookies(request, result.setCookies))
    }

    // Otra pestaña ganó la rotación hace un instante. En una navegación se
    // reintenta con las cookies que el navegador ya recibió; en una mutación se
    // deja pasar para no repetir la acción (el servidor devolverá el error).
    if (
      result.rotatedElsewhere &&
      request.method === "GET" &&
      !request.nextUrl.searchParams.has(RETRY_PARAM)
    ) {
      const retry = request.nextUrl.clone()
      retry.searchParams.set(RETRY_PARAM, "1")
      return NextResponse.redirect(retry)
    }
  } catch {
    // Sin conexión con la API: si el access token aún es válido seguimos; si no,
    // el usuario tendrá que volver a entrar.
    if (accessToken && !isJwtExpired(accessToken)) {
      return pass(request)
    }
  }

  return redirectToLogin(request)
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
}
