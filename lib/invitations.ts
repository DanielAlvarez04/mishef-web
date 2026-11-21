const API =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001/v1"

export interface InvitationPreview {
  organizationName: string
  organizationSlug: string
  email: string
  name: string | null
  username: string | null
  roles: string[]
  expiresAt: string
  alreadyHasAccount: boolean
}

/** Carga la invitación desde el servidor (sin cookies: es pública). */
export async function fetchInvitation(
  token: string
): Promise<InvitationPreview | null> {
  try {
    const response = await fetch(
      `${API}/public/invitations/${encodeURIComponent(token)}`,
      { cache: "no-store" }
    )

    if (!response.ok) return null

    return (await response.json()) as InvitationPreview
  } catch {
    return null
  }
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  WAITER: "Mesero",
  KITCHEN: "Cocina",
  CASHIER: "Cajero",
  INVENTORY_MANAGER: "Inventario",
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role
}
