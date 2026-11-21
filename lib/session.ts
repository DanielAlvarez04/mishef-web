import { cache } from "react"
import { redirect } from "next/navigation"

import { apiFetch } from "./api"

export interface SessionUser {
  id: string
  email: string | null
  username: string | null
  name: string | null
  emailVerified: boolean
  twoFactorEnabled: boolean
  /** 2FA con app autenticadora (TOTP). */
  twoFactorTotpEnabled: boolean
  /** Debe cambiar la contraseña inicial antes de operar. */
  mustChangePassword: boolean
  onboarded: boolean
  googleLinked: boolean
  roles: string[]
  organizationId: string | null
  /** Sucursal fija del miembro; `null` = puede operar en toda la organización. */
  branchId: string | null
  organizationName: string | null
  organizationDomain: string | null
  /** Color primario de la marca del negocio (`#rrggbb`), si lo definió. */
  organizationBrandColor: string | null
  /** URL pública del logo del negocio, si la definió. */
  organizationLogoUrl: string | null
  /** IVA por defecto del negocio como fracción (`0.16` = 16 %). */
  organizationTaxRate: string
  /** Moneda del negocio (código ISO 4217, p. ej. `MXN`). */
  organizationCurrency: string
  /** Tema visual del panel (`default`, `sky`, …). */
  organizationTheme: string
  /** La organización usa la sección de insumos core sugeridos. */
  organizationUseCoreSuggestions: boolean
  /** La organización usa los grupos de opciones core sugeridos. */
  organizationUseCoreOptionGroups: boolean
  /** Acceso al panel de plataforma (`/platform`, `/plans`, `/subscriptions`). */
  isPlatformAdmin: boolean
  /** Dueño del negocio; único que puede iniciar sesión desde el dominio principal. */
  isOwner: boolean
  /** Slug del negocio de la sesión (`mi-cafe`). */
  organizationSlug: string | null
  /** Permisos efectivos según los roles de la membresía. */
  permissions: string[]
  /** Modo práctica: no se registra analítica de operación. */
  organizationPracticeMode: boolean
  /** `true` si el modo práctica está vigente (no expiró). */
  organizationPracticeActive: boolean
  /** Fin automático del modo práctica; `null` = manual o inactivo. */
  organizationPracticeUntil: string | null
  /**
   * Datos del superadmin que abrió la sesión de soporte. `null` en una sesión
   * normal. Mientras exista, la app opera como el usuario objetivo, con un
   * límite: no se pueden cambiar credenciales, 2FA ni la suscripción.
   */
  impersonation: { byId: string; byName: string | null } | null
}

interface MeResponse {
  id: string
  email: string | null
  username?: string | null
  name: string | null
  emailVerified: boolean
  twoFactorEnabled: boolean
  /** 2FA con app autenticadora (TOTP). */
  twoFactorTotpEnabled: boolean
  /** Debe cambiar la contraseña inicial antes de operar. */
  mustChangePassword: boolean
  onboarded?: boolean
  googleLinked?: boolean
  isPlatformAdmin?: boolean
  isOwner?: boolean
  organizationSlug?: string | null
  permissions?: string[]
  roles: string[]
  organizationId?: string | null
  branchId?: string | null
  organization?: {
    id: string
    name: string
    slug?: string | null
    domain?: string | null
    brandColor?: string | null
    logoUrl?: string | null
    taxRate?: string | null
    currency?: string | null
    theme?: string | null
    useCoreSuggestions?: boolean | null
    useCoreOptionGroups?: boolean | null
    practiceMode?: boolean | null
    practiceActive?: boolean | null
    practiceUntil?: string | null
  } | null
  impersonation?: { byId: string; byName: string | null } | null
}

/**
 * Usuario de la sesión actual, o `null` si no hay sesión válida.
 *
 * `cache` evita repetir la llamada a `/auth/me` dentro del mismo render
 * (layout + página).
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  try {
    const response = await apiFetch("/auth/me")

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as MeResponse

    return {
      id: data.id,
      email: data.email,
      username: data.username ?? null,
      name: data.name,
      emailVerified: data.emailVerified,
      twoFactorEnabled: data.twoFactorEnabled,
      twoFactorTotpEnabled: data.twoFactorTotpEnabled ?? false,
      mustChangePassword: data.mustChangePassword ?? false,
      onboarded: data.onboarded ?? false,
      googleLinked: data.googleLinked ?? false,
      isPlatformAdmin: data.isPlatformAdmin ?? false,
      isOwner: data.isOwner ?? false,
      organizationSlug: data.organizationSlug ?? data.organization?.slug ?? null,
      permissions: data.permissions ?? [],
      roles: data.roles ?? [],
      organizationId: data.organizationId ?? data.organization?.id ?? null,
      branchId: data.branchId ?? null,
      organizationName: data.organization?.name ?? null,
      organizationDomain: data.organization?.domain ?? null,
      organizationBrandColor: data.organization?.brandColor ?? null,
      organizationLogoUrl: data.organization?.logoUrl ?? null,
      organizationTaxRate: data.organization?.taxRate ?? "0.16",
      organizationCurrency: data.organization?.currency ?? "MXN",
      organizationTheme: data.organization?.theme ?? "default",
      organizationUseCoreSuggestions:
        data.organization?.useCoreSuggestions ?? true,
      organizationUseCoreOptionGroups:
        data.organization?.useCoreOptionGroups ?? true,
      organizationPracticeMode: data.organization?.practiceMode ?? false,
      organizationPracticeActive: data.organization?.practiceActive ?? false,
      organizationPracticeUntil: data.organization?.practiceUntil ?? null,
      impersonation: data.impersonation ?? null,
    }
  } catch {
    return null
  }
})

/** Igual que `getCurrentUser`, pero redirige al login si no hay sesión. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  return user
}

/**
 * Exige uno de los roles indicados para renderizar la página.
 *
 * La API sigue siendo la barrera real; esto evita que un rol sin acceso vea
 * una pantalla vacía o datos que no le corresponden.
 */
export async function requireAnyRole(
  roles: readonly string[],
  redirectTo = "/dashboard"
): Promise<SessionUser> {
  const user = await requireUser()

  if (
    !user.isPlatformAdmin &&
    !user.roles.some((role) => roles.includes(role))
  ) {
    redirect(redirectTo)
  }

  return user
}

/** Nombre visible de una cuenta (interna o con correo). */
export function displayName(user: {
  name?: string | null
  username?: string | null
  email?: string | null
}): string {
  return user.name?.trim() || user.username || user.email || "Usuario"
}

export function isAdmin(user: { roles: string[] }): boolean {
  return user.roles.includes("ADMIN")
}
