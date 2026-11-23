"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MenuIcon } from "lucide-react"

import { useSidebar } from "@/components/ui/sidebar"
import {
  PLATFORM_NAV,
  SERVICE_NAV,
  canSeeNavItem,
  isNavItemActive,
  sortServiceNav,
  type NavItem,
} from "@/lib/navigation"
import { cn } from "cn"

/**
 * Navegación móvil.
 *
 * - Vertical: barra inferior.
 * - Horizontal por debajo de 1024px: riel lateral izquierdo, para no robarte
 *   altura al contenido.
 * - Escritorio: manda el sidebar existente.
 *
 * El POS conserva el color primario, pero como un botón rectangular dentro de
 * la barra, sin sobresalir ni tapar contenido.
 */
export function MobileTabBar({
  isPlatformAdmin = false,
  roles = [],
}: {
  isPlatformAdmin?: boolean
  roles?: string[]
}) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const items = React.useMemo(
    () =>
      isPlatformAdmin
        ? PLATFORM_NAV
        : SERVICE_NAV.filter((item) => canSeeNavItem(item, roles)),
    [isPlatformAdmin, roles]
  )
  const centerIndex = items.findIndex((item) => item.url === "/pos")
  // El riel horizontal usa el mismo orden que el sidebar de escritorio; la
  // barra inferior conserva el orden con el POS al centro.
  const railItems = React.useMemo(() => sortServiceNav(items), [items])

  return (
    <>
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 hidden border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 max-lg:portrait:block"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 items-stretch px-1 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))]">
          {items.map((item, index) =>
            index === centerIndex ? (
              <PosItem
                key={item.url}
                item={item}
                active={isNavItemActive(pathname, item.url)}
                variant="bottom"
              />
            ) : (
              <TabItem
                key={item.url}
                item={item}
                active={isNavItemActive(pathname, item.url)}
                variant="bottom"
              />
            )
          )}

          <MoreButton variant="bottom" onOpen={() => setOpenMobile(true)} />
        </div>
      </nav>

      <nav
        aria-label="Navegación principal"
        className="fixed inset-y-0 left-0 z-40 hidden w-[calc(4rem_+_env(safe-area-inset-left))] flex-col gap-1 border-r bg-card/95 px-1 pt-[calc(0.5rem_+_env(safe-area-inset-top))] pb-[calc(0.5rem_+_env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-card/85 max-lg:landscape:flex"
      >
        {railItems.map((item) =>
          item.url === "/pos" && !isPlatformAdmin ? (
            <PosItem
              key={item.url}
              item={item}
              active={isNavItemActive(pathname, item.url)}
              variant="rail"
            />
          ) : (
            <TabItem
              key={item.url}
              item={item}
              active={isNavItemActive(pathname, item.url)}
              variant="rail"
            />
          )
        )}

        <div className="mt-auto">
          <MoreButton variant="rail" onOpen={() => setOpenMobile(true)} />
        </div>
      </nav>
    </>
  )
}

function TabItem({
  item,
  active,
  variant,
}: {
  item: NavItem
  active: boolean
  variant: "bottom" | "rail"
}) {
  const Icon = item.icon
  const label = item.mobileTitle ?? item.title

  return (
    <Link
      href={item.url}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-muted/60",
        variant === "bottom" ? "min-h-14" : "min-h-12 text-[9px]",
        active
          ? "text-primary"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-md transition-colors",
          variant === "bottom" ? "h-7 w-10" : "h-6 w-9",
          active && "bg-primary/10"
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="max-w-full truncate">{label}</span>
    </Link>
  )
}

/**
 * POS con el color primario, integrado en la navegación.
 *
 * Es rectangular y del mismo alto que las demás tabs: no flota ni se sale del
 * contenedor. En vertical ocupa su celda; en horizontal, el ancho del riel.
 */
function PosItem({
  item,
  active,
  variant,
}: {
  item: NavItem
  active: boolean
  variant: "bottom" | "rail"
}) {
  const Icon = item.icon
  const label = item.mobileTitle ?? item.title

  return (
    <Link
      href={item.url}
      aria-current={active ? "page" : undefined}
      aria-label={item.title}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 rounded-lg bg-primary px-1 font-semibold text-primary-foreground shadow-sm transition-transform focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:scale-[0.97]",
        variant === "bottom" ? "min-h-14 text-[10px]" : "min-h-12 text-[9px]"
      )}
    >
      <Icon className="size-5" aria-hidden />
      <span className="max-w-full truncate">{label}</span>
    </Link>
  )
}

function MoreButton({
  variant,
  onOpen,
}: {
  variant: "bottom" | "rail"
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Abrir menú de navegación"
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-muted/60",
        variant === "bottom" ? "min-h-14 text-[10px]" : "min-h-12 text-[9px]"
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-md",
          variant === "bottom" ? "h-7 w-10" : "h-6 w-9"
        )}
      >
        <MenuIcon className="size-5" aria-hidden />
      </span>
      <span className="max-w-full truncate">Más</span>
    </button>
  )
}
