"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ClockIcon } from "lucide-react"

import { OfflineStatus } from "@/components/offline/offline-status"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/pos": "Punto de venta",
  "/kitchen": "Cocina",
  "/menus": "Menús",
  "/catalog": "Catálogo",
  "/inventory": "Inventario",
  "/reports": "Reportes",
  "/reports/food-cost": "Food cost",
  "/reports/leakage": "Fuga interna",
  "/reports/benchmark": "Benchmark",
  "/attendance": "Asistencia",
  "/waste": "Merma",
  "/settings": "Configuración",
  "/platform": "Plataforma",
  "/plans": "Planes",
  "/subscriptions": "Suscripciones",
  "/users": "Usuarios",
  "/billing": "Facturación",
}

export function SiteHeader({
  branchName,
  showClock = false,
}: {
  branchName?: string | null
  showClock?: boolean
}) {
  const pathname = usePathname()

  const nestedTitle = Object.keys(pageTitles)
    .sort((left, right) => right.length - left.length)
    .find((path) => pathname.startsWith(`${path}/`))

  const pageTitle = pageTitles[pathname] ?? pageTitles[nestedTitle ?? ""] ?? "Mishef"

  // El alcance de la vista siempre está a la vista: si hay sucursal activa el
  // título lo dice explícitamente ("Inventario de Centro").
  const title = branchName ? `${pageTitle} de ${branchName}` : pageTitle

  return (
    <header className="flex h-[calc(var(--header-height)+env(safe-area-inset-top))] shrink-0 items-center gap-2 border-b bg-card pt-[env(safe-area-inset-top)] transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(var(--header-height)+env(safe-area-inset-top))]">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 hidden lg:inline-flex" />
        <Separator
          orientation="vertical"
          className="mx-2 hidden h-4 self-center! lg:block"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
          {showClock ? (
            <Button
              variant="outline"
              size="icon"
              title="Checador"
              nativeButton={false}
              render={<Link href="/attendance" />}
            >
              <ClockIcon className="size-4" />
              <span className="sr-only">Checador</span>
            </Button>
          ) : null}
          <OfflineStatus />
        </div>
      </div>
    </header>
  )
}
