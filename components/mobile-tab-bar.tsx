"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MenuIcon } from "lucide-react"

import { useSidebar } from "@/components/ui/sidebar"
import {
  PLATFORM_NAV,
  SERVICE_NAV,
  isNavItemActive,
  type NavItem,
} from "@/lib/navigation"
import { cn } from "cn"

/**
 * Barra de navegación inferior para teléfono y tablet vertical.
 *
 * Replica el grupo «Servicio» del sidebar y deja el POS en el centro, elevado
 * con el color primario. «Más» abre el sidebar completo. En escritorio se
 * oculta: ahí manda el sidebar.
 */
export function MobileTabBar({
  isPlatformAdmin = false,
}: {
  isPlatformAdmin?: boolean
}) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const items = isPlatformAdmin ? PLATFORM_NAV : SERVICE_NAV
  const centerIndex = isPlatformAdmin ? -1 : 2

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-1 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))]">
        {items.map((item, index) =>
          index === centerIndex ? (
            <CenterItem
              key={item.url}
              item={item}
              active={isNavItemActive(pathname, item.url)}
            />
          ) : (
            <TabItem
              key={item.url}
              item={item}
              active={isNavItemActive(pathname, item.url)}
            />
          )
        )}

        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          aria-label="Abrir menú de navegación"
          className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-muted/60"
        >
          <span className="flex h-7 w-10 items-center justify-center rounded-full">
            <MenuIcon className="size-5" aria-hidden />
          </span>
          <span className="max-w-full truncate">Más</span>
        </button>
      </div>
    </nav>
  )
}

function TabItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon

  return (
    <Link
      href={item.url}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-muted/60",
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "flex h-7 w-10 items-center justify-center rounded-full transition-colors",
          active && "bg-primary/10"
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="max-w-full truncate">{item.mobileTitle ?? item.title}</span>
    </Link>
  )
}

/**
 * Acción central elevada.
 *
 * No es una tab más: es el acceso rápido al POS y conserva el color primario
 * del negocio. El anillo usa el fondo de la barra para separarlo visualmente.
 */
function CenterItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon

  return (
    <Link
      href={item.url}
      aria-current={active ? "page" : undefined}
      aria-label={item.title}
      className="group relative flex flex-col items-center gap-1 focus-visible:outline-none"
    >
      <span
        className={cn(
          "-mt-5 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-card transition-transform group-active:scale-95 group-focus-visible:ring-primary/40",
          active && "ring-primary/25"
        )}
      >
        <Icon className="size-6" aria-hidden />
      </span>
      <span
        className={cn(
          "pb-0.5 text-[10px] font-semibold",
          active ? "text-primary" : "text-muted-foreground"
        )}
      >
        {item.mobileTitle ?? item.title}
      </span>
    </Link>
  )
}
