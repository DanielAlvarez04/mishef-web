"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { apiFetch, BRANCH_COOKIE, IMPERSONATION_COOKIE } from "@/lib/api"
import { apiErrorMessage } from "@/lib/http-error"
import { requireUser } from "@/lib/session"
import type { ActionResult } from "@/lib/server-api"

/** Origen que la API exige en las peticiones mutantes autenticadas por cookie. */
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000"

/** La API emite el token de soporte con esta vigencia; la cookie la replica. */
const IMPERSONATION_TTL_MS = 30 * 60 * 1000

/** Dominio compartido con la API (`np_at`/`np_rt`); vacío = host-only. */
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN?.trim() || undefined

interface ImpersonationResponse {
  accessToken: string
  expiresAt: string
  user: {
    id: string
    name: string | null
    email: string | null
    organizationName: string
  }
  actor: { id: string; name: string }
}

/**
 * Abre una sesión de soporte de solo lectura como otro usuario.
 *
 * No reemplaza `np_at` ni `np_rt`: escribe una cookie aparte (`np_imp`) que la
 * API prefiere mientras exista. La sesión real del superadmin y todas las del
 * usuario objetivo quedan intactas.
 */
export async function startImpersonation(
  userId: string,
  organizationId: string
): Promise<ActionResult<ImpersonationResponse>> {
  const actor = await requireUser()

  if (!actor.isPlatformAdmin) {
    return {
      ok: false,
      message: "Solo el equipo de Mishef puede abrir sesiones de soporte.",
    }
  }

  let response: Response

  try {
    response = await apiFetch(
      `/platform/users/${encodeURIComponent(userId)}/impersonate`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: WEB_ORIGIN,
        },
        body: JSON.stringify({ organizationId }),
      }
    )
  } catch {
    return {
      ok: false,
      message: "No se pudo contactar con la API. Inténtalo de nuevo.",
      network: true,
    }
  }

  const payload = (await response.json().catch(() => null)) as
    | ImpersonationResponse
    | null

  if (!response.ok || !payload?.accessToken) {
    return {
      ok: false,
      message: apiErrorMessage(
        payload,
        "No pudimos abrir la sesión de soporte."
      ),
      status: response.status,
    }
  }

  const store = await cookies()
  // Mismo `COOKIE_DOMAIN` que usan `np_at`/`np_rt`: en producción el panel y la
  // API viven en subdominios distintos. En local queda host-only.
  store.set(IMPERSONATION_COOKIE, payload.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: IMPERSONATION_TTL_MS / 1000,
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
  })

  // La sucursal activa pudo elegirse en otro negocio: no debe arrastrarse.
  store.delete(BRANCH_COOKIE)

  revalidatePath("/", "layout")
  redirect("/dashboard")
}

/**
 * Cierra la sesión de soporte y vuelve al listado de usuarios.
 *
 * Aunque la API no responda, la cookie local se borra: el token caduca solo a
 * los 30 minutos y no hay refresh.
 */
export async function stopImpersonation(): Promise<void> {
  const store = await cookies()

  if (store.get(IMPERSONATION_COOKIE)?.value) {
    try {
      await apiFetch("/auth/impersonation/end", {
        method: "POST",
        headers: { origin: WEB_ORIGIN },
      })
    } catch {
      // La sesión caduca sola; lo importante es dejar de usarla ya.
    }
  }

  store.set(IMPERSONATION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
  })
  store.delete(BRANCH_COOKIE)

  revalidatePath("/", "layout")
  redirect("/users")
}
