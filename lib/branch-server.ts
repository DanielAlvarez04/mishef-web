import { cookies } from "next/headers"
import { cache } from "react"

import { apiFetch, BRANCH_COOKIE } from "./api"
import type { Branch } from "./branches"
import { getCurrentUser } from "./session"

/**
 * Sucursales visibles para la sesión actual.
 *
 * La API limita la lista a la sucursal asignada cuando el miembro no puede
 * operar sobre toda la organización.
 */
export const getBranches = cache(async (): Promise<Branch[]> => {
  try {
    const response = await apiFetch("/branches")

    if (!response.ok) {
      return []
    }

    return (await response.json()) as Branch[]
  } catch {
    return []
  }
})

/** Sucursal activa según la cookie `np_branch`, validada contra la API. */
export const getActiveBranch = cache(async (): Promise<Branch | null> => {
  const store = await cookies()
  const cookieId = store.get(BRANCH_COOKIE)?.value
  const branches = await getBranches()

  // Quien tiene sucursal fija opera siempre en ella: la API lo fuerza aunque
  // no haya cookie, así que la UI debe reflejarlo igual. Con una sola
  // sucursal activa también se usa sin exigir cookie.
  const user = await getCurrentUser()
  const active = branches.filter((branch) => branch.isActive)
  const id =
    user?.branchId ?? cookieId ?? (active.length === 1 ? active[0].id : null)

  if (!id) {
    return null
  }

  return active.find((branch) => branch.id === id) ?? null
})
