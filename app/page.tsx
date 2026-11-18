import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/session"

/**
 * Entrada de la app.
 *
 * El sitio de marketing vive en `mishef.co`; `app.mishef.co` siempre entra al
 * panel: login si no hay sesión, plataforma o dashboard según la cuenta.
 */
export default async function RootPage() {
  const user = await getCurrentUser()

  if (!user) redirect("/login")

  redirect(user.isPlatformAdmin ? "/platform" : "/dashboard")
}
