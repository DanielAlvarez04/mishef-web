import { redirect } from "next/navigation"
import { cookies, headers } from "next/headers"

import { AppSidebar } from "@/components/app-sidebar"
import { BillingBanner } from "@/components/billing/billing-banner"
import { OfflineProvider } from "@/components/offline/offline-provider"
import { PracticeModeWatcher } from "@/components/practice-mode-watcher"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import type { Branch } from "@/lib/branches"
import { getActiveBranch, getBranches } from "@/lib/branch-server"
import { CurrencyProvider } from "@/lib/currency"
import { brandStyle } from "@/lib/brand"
import { designCss, normalizeDesignTokens } from "@/lib/design"
import { readApi } from "@/lib/server-api"
import { displayName, isAdmin, requireUser } from "@/lib/session"

/**
 * Rutas del panel de plataforma. Un superadmin no ve el panel del negocio:
 * cualquier otra ruta lo devuelve a `/platform`.
 */
const PLATFORM_PATHS = [
  "/platform",
  "/plans",
  "/subscriptions",
  "/users",
  "/styles",
]

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()

  // Las altas nuevas (registro público o Google) configuran su negocio y
  // usuario antes de entrar. Las cuentas internas de empleados no pasan por el
  // onboarding: las crea un ADMIN y el paso del negocio requiere ADMIN.
  if (!user.onboarded && isAdmin(user)) {
    redirect("/onboarding")
  }

  // El proxy inyecta `x-pathname`; sin esa cabecera se deja pasar para no
  // provocar un bucle de redirecciones.
  const pathname = ((await headers()).get("x-pathname") ?? "").split("?")[0]
  const platformArea = PLATFORM_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
  const platformMode = user.isPlatformAdmin

  if (platformMode && pathname && !platformArea) {
    redirect("/platform")
  }

  // El superadmin opera sobre `mishef-platform`: no necesita sucursales y la
  // consulta solo añadiría latencia.
  const [branches, activeBranch] = platformMode
    ? ([[] as Branch[], null] as [Branch[], Branch | null])
    : await Promise.all([getBranches(), getActiveBranch()])

  // El `SidebarProvider` guarda el estado en la cookie `sidebar_state`: se lee
  // aquí para que el sidebar arranque colapsado si el usuario lo dejó así.
  const cookieStore = await cookies()
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false"

  // Estilos globales aplicados desde /styles. El borrador no se inyecta.
  const designResult = await readApi<{ applied: unknown }>("/design")
  const designTokens = designResult.ok
    ? normalizeDesignTokens(designResult.data?.applied)
    : null

  return (
    <CurrencyProvider currency={user.organizationCurrency}>
      {designTokens ? (
        <style
          data-design-tokens
          dangerouslySetInnerHTML={{ __html: designCss(designTokens) }}
        />
      ) : null}
      <OfflineProvider userId={user.id}>
        <PracticeModeWatcher
          active={user.organizationPracticeMode}
          until={user.organizationPracticeUntil}
        />
        <SidebarProvider
          defaultOpen={sidebarOpen}
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
          <SidebarInset className="ml-0! h-svh overflow-hidden">
            <SiteHeader
              branchName={
                branches.length > 1 ? (activeBranch?.name ?? null) : null
              }
            />
            <BillingBanner enabled={isAdmin(user) && !user.isPlatformAdmin} />
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </OfflineProvider>
    </CurrencyProvider>
  )
}
