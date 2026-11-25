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
 * La pestaña activa usa el color primario. El POS conserva ese color cuando
 * no está activo para seguir siendo el acceso principal.
 */
export function MobileTabBar({
  isPlatformAdmin = false,
  roles = [],
  features = {},
}: {
  isPlatformAdmin?: boolean
  roles?: string[]
  features?: Record<string, boolean>
}) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const items = React.useMemo(
    () =>
      isPlatformAdmin
        ? PLATFORM_NAV
        : SERVICE_NAV.filter((item) =>
            canSeeNavItem(item, roles, features)
          ),
    [isPlatformAdmin, roles, features]
  )
  // El riel horizontal usa el mismo orden que el sidebar de escritorio; la
  // barra inferior conserva el orden con el POS al centro.
  const railItems = React.useMemo(() => sortServiceNav(items), [items])

  return (
    <>
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 hidden border-t bg-card max-lg:portrait:block"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 items-stretch px-1 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))]">
          {items.map((item) => (
            <TabItem
              key={item.url}
              item={item}
              active={isNavItemActive(pathname, item.url)}
              highlight={item.url === "/pos" && !isPlatformAdmin}
              variant="bottom"
            />
          ))}

          <MoreButton variant="bottom" onOpen={() => setOpenMobile(true)} />
        </div>
      </nav>

      <nav
        aria-label="Navegación principal"
        className="fixed inset-y-0 left-0 z-40 hidden w-[calc(4rem_+_env(safe-area-inset-left))] flex-col gap-1 border-r bg-card px-1 pt-[calc(0.5rem_+_env(safe-area-inset-top))] pb-[calc(0.5rem_+_env(safe-area-inset-bottom))] max-lg:landscape:flex"
      >
        {railItems.map((item) => (
          <TabItem
            key={item.url}
            item={item}
            active={isNavItemActive(pathname, item.url)}
            highlight={item.url === "/pos" && !isPlatformAdmin}
            variant="rail"
          />
        ))}

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
  highlight = false,
  variant,
}: {
  item: NavItem
  active: boolean
  /** Conserva el color primario cuando el POS no está activo. */
  highlight?: boolean
  variant: "bottom" | "rail"
}) {
  const Icon = item.icon
  const label = item.mobileTitle ?? item.title

  return (
    <Link
      href={item.url}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 font-medium transition-[color,background-color,transform] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        variant === "bottom" ? "min-h-14 text-[10px]" : "min-h-12 text-[9px]",
        active
          ? "bg-primary font-semibold text-primary-foreground shadow-sm active:scale-[0.97]"
          : highlight
            ? "text-primary hover:bg-primary/10 active:bg-primary/15"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground active:bg-muted/60"
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-md transition-colors",
          variant === "bottom" ? "h-7 w-10" : "h-6 w-9"
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
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
