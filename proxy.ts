import { NextResponse, type NextRequest } from "next/server"

const ACCESS_TOKEN_COOKIE = "np_at"
const REFRESH_TOKEN_COOKIE = "np_rt"
/** Sesión de soporte del superadmin; tiene prioridad sobre `np_at` en la API. */
const IMPERSONATION_COOKIE = "np_imp"
/** Evita que varias peticiones renueven la sesión a la vez. */
const REFRESH_LOCK_COOKIE = "np_rl"
/** Se renueva el access token cuando le quedan menos de 2 minutos. */
const REFRESH_LEEWAY_MS = 2 * 60 * 1000
/** Tiempo que se comparte el resultado de un refresh entre peticiones. */
const REFRESH_FLIGHT_RETENTION_MS = 10_000
const RETRY_PARAM = "_session_retry"

/** Debe coincidir con el `COOKIE_DOMAIN` de la API para borrar `np_imp`. */
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN?.trim() || undefined

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/pair",
  "/pos/unlock",
  "/display",
  // Páginas públicas: legales e ingreso por invitación.
  "/privacidad",
  "/terminos",
  "/join",
  // Carta digital del negocio.
  "/menu",
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
/** Ruta original de la petición, para redirecciones entre hosts. */
const PATH_HEADER = "x-pathname";
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
  "z",
]);
// `demo` no está aquí a propósito: es el negocio de demostración controlado.
// La API lo resuelve con `DEMO_TENANT_SLUGS`, pero sigue reservado para altas
// normales.

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

  // Ruta original: la usan las redirecciones por cambio de dirección.
  next.set(PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);

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

function clearAuthCookie(response: NextResponse, name: string): NextResponse {
  response.cookies.set(name, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
  })

  return response
}

function clearImpersonationCookie(response: NextResponse): NextResponse {
  return clearAuthCookie(response, IMPERSONATION_COOKIE)
}

function redirectToLogin(request: NextRequest): NextResponse {
  // Una caja vinculada por QR entra con PIN en lugar de contraseña.
  const hasDevice = Boolean(request.cookies.get("np_pos_device")?.value)
  const response = NextResponse.redirect(
    new URL(hasDevice ? "/pos/unlock" : "/login", request.url)
  )
  clearAuthCookie(response, ACCESS_TOKEN_COOKIE)
  clearAuthCookie(response, REFRESH_TOKEN_COOKIE)
  clearImpersonationCookie(response)
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
async function accessTokenIsValid(
  accessToken: string,
  cookieName = ACCESS_TOKEN_COOKIE
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { cookie: `${cookieName}=${accessToken}` },
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

interface RefreshFlight {
  promise: Promise<RefreshResult>
  settledAt: number | null
}

/**
 * Single-flight del refresh dentro del proceso.
 *
 * El lock por cookie no alcanza a las peticiones que ya salieron con el token
 * viejo (varios prefetch, RSC y acciones a la vez). Compartir la misma promesa
 * evita que dos peticiones pidan rotar el mismo refresh token y que una de
 * ellas termine en /login.
 */
const refreshFlights = new Map<string, RefreshFlight>()

function refreshSessionOnce(refreshToken: string): Promise<RefreshResult> {
  const now = Date.now()
  const current = refreshFlights.get(refreshToken)

  if (
    current &&
    (current.settledAt === null ||
      now - current.settledAt < REFRESH_FLIGHT_RETENTION_MS)
  ) {
    return current.promise
  }

  const flight: RefreshFlight = {
    promise: refreshSession(refreshToken),
    settledAt: null,
  }
  refreshFlights.set(refreshToken, flight)

  const settle = () => {
    flight.settledAt = Date.now()

    setTimeout(() => {
      if (refreshFlights.get(refreshToken) === flight) {
        refreshFlights.delete(refreshToken)
      }
    }, REFRESH_FLIGHT_RETENTION_MS)
  }

  // `then` con dos callbacks evita una promesa rechazada sin manejar.
  void flight.promise.then(settle, settle)

  return flight.promise
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
  const impersonationToken = request.cookies.get(IMPERSONATION_COOKIE)?.value

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )

  // La pantalla del cliente se abre en un monitor sin sesión y nunca debe
  // redirigirse al panel.
  if (pathname.startsWith("/display")) {
    return pass(request)
  }

  /**
   * Sesión de soporte: manda sobre la del superadmin mientras exista.
   *
   * No se renueva (no tiene refresh): al caducar se borra `np_imp` y se vuelve
   * al panel de plataforma con la sesión original, que nunca se tocó.
   */
  if (impersonationToken) {
    if (isJwtExpired(impersonationToken)) {
      const response = NextResponse.redirect(
        new URL(accessToken ? "/users" : "/login", request.url)
      )
      return clearImpersonationCookie(response)
    }

    // En una ruta pública se comprueba contra la API para no dejar el
    // formulario de login activo con una sesión de soporte vigente.
    if (isPublic) {
      if (
        await accessTokenIsValid(impersonationToken, IMPERSONATION_COOKIE)
      ) {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }

      return clearImpersonationCookie(pass(request))
    }

    return pass(request)
  }

  // Dentro del subdominio de un negocio (o de su dominio propio) no se ofrece
  // crear otra cuenta: el registro vive solo en el dominio principal.
  if (
    pathname === "/register" &&
    (tenantOf(request) || customDomainOf(request))
  ) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Rutas públicas: si hay una sesión válida se entra directo al dashboard;
  // si el token está vigente pero la sesión ya no existe, se limpian las
  // cookies y se deja ver el formulario (evita el bucle de redirecciones).
  if (isPublic) {
    if (!accessToken || isJwtExpired(accessToken)) {
      return pass(request)
    }

    if (await accessTokenIsValid(accessToken)) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    const response = pass(request)
    clearAuthCookie(response, ACCESS_TOKEN_COOKIE)
    clearAuthCookie(response, REFRESH_TOKEN_COOKIE)
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
    const result = await refreshSessionOnce(refreshToken)

    if (result.ok) {
      return lockRefresh(withSessionCookies(request, result.setCookies))
    }

    // Otra pestaña ganó la rotación hace un instante. En una navegación se
    // reintenta con las cookies que el navegador ya recibió; en una mutación se
    // deja pasar para no repetir la acción ni cerrar la sesión.
    if (result.rotatedElsewhere) {
      if (
        request.method === "GET" &&
        !request.nextUrl.searchParams.has(RETRY_PARAM)
      ) {
        const retry = request.nextUrl.clone()
        retry.searchParams.set(RETRY_PARAM, "1")
        return NextResponse.redirect(retry)
      }

      return pass(request)
    }
  } catch {
    // Sin conexión con la API: no se borran las cookies. Es preferible mostrar
    // un error temporal a cerrar una sesión que sigue siendo válida.
    return pass(request)
  }

  return redirectToLogin(request)
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
}
