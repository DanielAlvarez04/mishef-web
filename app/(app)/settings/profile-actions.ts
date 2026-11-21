"use server"

import { revalidatePath } from "next/cache"

import { mutateApi, type ActionResult } from "@/lib/server-api"
import { requireUser } from "@/lib/session"

export interface ProfileUpdate {
  name?: string
  username?: string
  email?: string
}

/** Actualiza el perfil del usuario y refresca el layout (nombre en el header). */
export async function updateOwnProfile(
  input: ProfileUpdate
): Promise<ActionResult> {
  await requireUser()

  const result = await mutateApi("/auth/me", "PATCH", input, [
    "/settings",
    "/dashboard",
  ])

  if (result.ok) {
    revalidatePath("/", "layout")
  }

  return result
}
