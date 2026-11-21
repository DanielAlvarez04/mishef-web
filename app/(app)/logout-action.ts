"use server"

import { cookies } from "next/headers"

import { apiFetch } from "@/lib/api"
import { currentOrigin, mainAppOrigin } from "@/lib/app-origin"
import { getCurrentUser } from "@/lib/session"
import type { ActionResult } from "@/lib/server-api"

const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000"
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN?.trim() || undefined

const AUTH_COOKIES = ["np_at", "np_rt", "np_imp", "np_branch"]

/**
 * Cierra la sesión, limpia todas las cookies de autenticación y decide el
 * host de login: el principal para plataforma/soporte, el actual para equipos.
 */
export async function logout(): Promise<
  ActionResult<{ redirectTo: string }>
> {
  const user = await getCurrentUser()

  try {
    await apiFetch("/auth/logout", {
      method: "POST",
      headers: { origin: WEB_ORIGIN },
    })
  } catch {
    // La sesión local se limpia igualmente.
  }

  const store = await cookies()

  for (const name of AUTH_COOKIES) {
    store.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
    })
  }

  const mainOrigin = await mainAppOrigin()
  const requestOrigin = await currentOrigin()
  const isPlatform = Boolean(user?.isPlatformAdmin || user?.impersonation)
  const origin = isPlatform ? mainOrigin : requestOrigin

  return {
    ok: true,
    data: { redirectTo: origin ? `${origin}/login` : "/login" },
  }
}
