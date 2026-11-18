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
  "/catalog": "Catálogo",
  "/inventory": "Inventario",
  "/reports": "Reportes",
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
  inShift = false,
}: {
  branchName?: string | null
  showClock?: boolean
  inShift?: boolean
}) {
  const pathname = usePathname()

  const pageTitle =
    pageTitles[pathname] ??
    pageTitles[
      Object.keys(pageTitles).find((path) => pathname.startsWith(`${path}/`)) ??
        ""
    ] ??
    "Mishef"

  // El alcance de la vista siempre está a la vista: si hay sucursal activa el
  // título lo dice explícitamente ("Inventario de Centro").
  const title = branchName ? `${pageTitle} de ${branchName}` : pageTitle

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-card transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 self-center!"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
          {showClock ? (
            <Button
              variant="outline"
              size="icon"
              className="relative"
              title={inShift ? "Checador · en turno" : "Checador"}
              render={<Link href="/attendance" />}
            >
              <ClockIcon className="size-4" />
              {inShift ? (
                <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-emerald-500" />
              ) : null}
              <span className="sr-only">Checador</span>
            </Button>
          ) : null}
          <OfflineStatus />
        </div>
      </div>
    </header>
  )
}
