import { redirect } from "next/navigation"
import { cookies, headers } from "next/headers"

import { AppSidebar } from "@/components/app-sidebar"
import { BillingBanner } from "@/components/billing/billing-banner"
import { ImpersonationBanner } from "@/components/impersonation-banner"
import { MobileTabBar } from "@/components/mobile-tab-bar"
import { OfflineProvider } from "@/components/offline/offline-provider"
import { PracticeModeWatcher } from "@/components/practice-mode-watcher"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { resendVerificationForm } from "@/app/(app)/settings/security-actions"
import type { Branch } from "@/lib/branches"
import { getActiveBranch, getBranches } from "@/lib/branch-server"
import { CurrencyProvider } from "@/lib/currency"
import { brandStyle } from "@/lib/brand"
import { displayName, isAdmin, requireUser } from "@/lib/session"
import { getTenant } from "@/lib/tenant"

/**
 * Rutas del panel de plataforma. Un superadmin no ve el panel del negocio:
 * cualquier otra ruta lo devuelve a `/platform`.
 */
const PLATFORM_PATHS = [
  "/platform",
  "/plans",
  "/subscriptions",
  "/users",
]

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()

  // Las altas nuevas (registro público o Google) configuran su negocio y
  // usuario antes de entrar. Las cuentas internas de empleados no pasan por el
  // onboarding: las crea un ADMIN y el paso del negocio requiere ADMIN. En una
  // sesión de soporte no se fuerza el onboarding del usuario objetivo.
  if (!user.onboarded && isAdmin(user) && !user.impersonation) {
    redirect("/onboarding")
  }

  // El proxy inyecta `x-pathname`; sin esa cabecera se deja pasar para no
  // provocar un bucle de redirecciones.
  const requestHeaders = await headers()
  const pathname = (requestHeaders.get("x-pathname") ?? "").split("?")[0]
  const host = (
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    ""
  )
    .split(":")[0]
    .trim()
    .toLowerCase()
  const tenantSlug = requestHeaders.get("x-tenant")?.trim().toLowerCase() ?? null
  const tenantDomain =
    requestHeaders.get("x-tenant-domain")?.trim().toLowerCase() ?? null
  const isLocalHost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".local") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host)
  const configuredBase = (
    process.env.NEXT_PUBLIC_TENANT_DOMAIN ?? "mishef.co"
  )
    .trim()
    .toLowerCase()
  const baseDomain = host.startsWith("app.")
    ? host.slice(4)
    : host.startsWith("www.")
      ? host.slice(4)
      : configuredBase
  const tenantHome = user.organizationSlug
    ? `https://${user.organizationSlug}.${baseDomain}`
    : null

  // Solo el dominio principal permite al dueño; el resto de usuarios debe
  // entrar por su subdominio. Además, una sesión de otro negocio nunca se
  // reutiliza en el host equivocado.
  if (!user.isPlatformAdmin && !isLocalHost && tenantHome) {
    if (tenantSlug || tenantDomain) {
      const tenant = await getTenant()

      if (tenant?.slug && tenant.slug !== user.organizationSlug) {
        redirect(`${tenantHome}${pathname || "/dashboard"}`)
      }
    } else if (host === `app.${baseDomain}` || host === baseDomain) {
      redirect(`${tenantHome}${pathname || "/dashboard"}`)
    }
  }

  const platformArea = PLATFORM_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
  const platformMode = user.isPlatformAdmin

  if (platformMode && pathname && !platformArea) {
    redirect("/platform")
  }

  // El superadmin opera sobre `mishef-platform`: no necesita sucursales y la
  // consulta solo añadiría latencia.
  if (user.mustChangePassword && pathname && pathname !== "/settings") {
    redirect("/settings?password=required")
  }

  const [branches, activeBranch] = platformMode
    ? ([[] as Branch[], null] as [Branch[], Branch | null])
    : await Promise.all([getBranches(), getActiveBranch()])

  // El `SidebarProvider` guarda el estado en la cookie `sidebar_state`: se lee
  // aquí para que el sidebar arranque colapsado si el usuario lo dejó así.
  const cookieStore = await cookies()
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false"

  return (
    <CurrencyProvider currency={user.organizationCurrency}>
      <OfflineProvider userId={user.id}>
        <PracticeModeWatcher
          active={user.organizationPracticeMode}
          until={user.organizationPracticeUntil}
        />
        <SidebarProvider
          defaultOpen={sidebarOpen}
          data-theme={user.organizationTheme}
          style={
            {
              ...brandStyle(user.organizationBrandColor),
              "--sidebar-width": "calc(var(--spacing) * 72)",
              "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties
          }
        >
          <AppSidebar
            variant="inset"
            organizationName={user.organizationName}
            isAdmin={isAdmin(user)}
            isPlatformAdmin={user.isPlatformAdmin}
            roles={user.roles}
            branches={branches}
            activeBranchId={activeBranch?.id ?? user.branchId ?? null}
            lockedBranch={Boolean(user.branchId)}
            user={{
              name: displayName(user),
              email: user.email,
              username: user.username,
              role: user.roles[0],
            }}
          />
          <SidebarInset className="h-svh overflow-y-auto max-lg:landscape:pl-[calc(4rem_+_env(safe-area-inset-left))]">
            <SiteHeader
              branchName={
                branches.length > 1 ? (activeBranch?.name ?? null) : null
              }
              showClock={!platformMode}
            />
            {!user.isPlatformAdmin && user.email && !user.emailVerified ? (
              <div className="border-b bg-amber-500/10 px-4 py-2 text-sm lg:px-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-amber-800 dark:text-amber-300">
                    Verifica tu correo <strong>{user.email}</strong> para
                    desbloquear facturación, dominio propio y 2FA.
                  </span>
                  <form action={resendVerificationForm}>
                    <Button type="submit" size="sm" variant="outline">
                      Reenviar verificación
                    </Button>
                  </form>
                </div>
              </div>
            ) : null}
            {user.impersonation ? (
              <ImpersonationBanner
                userName={displayName(user)}
                organizationName={user.organizationName}
                byName={user.impersonation.byName}
              />
            ) : null}
            <BillingBanner enabled={isAdmin(user) && !user.isPlatformAdmin} />
            <div className="flex min-h-0 flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] max-lg:landscape:pb-0 lg:pb-0">
              {children}
            </div>
          </SidebarInset>
          <MobileTabBar
            isPlatformAdmin={user.isPlatformAdmin}
            roles={user.roles}
          />
        </SidebarProvider>
      </OfflineProvider>
    </CurrencyProvider>
  )
}
