import {
  BarChart3Icon,
  BadgeDollarSignIcon,
  ChartBarIcon,
  ChefHatIcon,
  ClockIcon,
  CookingPotIcon,
  LayoutDashboardIcon,
  NotebookTextIcon,
  PackageIcon,
  PercentIcon,
  Settings2Icon,
  ShieldAlertIcon,
  ShoppingBasketIcon,
  StoreIcon,
  Trash2Icon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

/**
 * Definición compartida de la navegación.
 *
 * La consumen el sidebar de escritorio y la barra inferior móvil, para que
 * ambos muestren los mismos destinos y no se desincronicen al agregar rutas.
 */
export interface NavItem {
  title: string
  /** Etiqueta corta para la barra inferior. */
  mobileTitle?: string
  url: string
  icon: LucideIcon
}

/** Grupo «Servicio»: es el que aparece en la barra inferior. */
export const SERVICE_NAV: NavItem[] = [
  {
    title: "Dashboard",
    mobileTitle: "Inicio",
    url: "/dashboard",
    icon: LayoutDashboardIcon,
  },
  { title: "Menús", url: "/menus", icon: NotebookTextIcon },
  {
    title: "Punto de venta",
    mobileTitle: "POS",
    url: "/pos",
    icon: ShoppingBasketIcon,
  },
  { title: "Cocina", url: "/kitchen", icon: ChefHatIcon },
]

/** Grupo «Aplicación»: solo en el sidebar completo. */
export const APPLICATION_NAV: NavItem[] = [
  { title: "Catálogo", url: "/catalog", icon: CookingPotIcon },
  { title: "Inventario", url: "/inventory", icon: PackageIcon },
  { title: "Reportes", url: "/reports", icon: ChartBarIcon },
  { title: "Food cost", url: "/reports/food-cost", icon: PercentIcon },
  { title: "Fuga interna", url: "/reports/leakage", icon: ShieldAlertIcon },
  { title: "Asistencia", url: "/attendance", icon: ClockIcon },
  { title: "Merma", url: "/waste", icon: Trash2Icon },
  { title: "Benchmark", url: "/reports/benchmark", icon: BarChart3Icon },
]

/** Grupo «Plataforma» del superadmin. */
export const PLATFORM_NAV: NavItem[] = [
  { title: "Resumen", url: "/platform", icon: LayoutDashboardIcon },
  { title: "Planes", url: "/plans", icon: BadgeDollarSignIcon },
  { title: "Suscripciones", url: "/subscriptions", icon: StoreIcon },
  { title: "Usuarios", url: "/users", icon: UsersIcon },
]

/** Acceso a Configuración desde el sidebar. */
export const SETTINGS_NAV: NavItem = {
  title: "Configuración",
  url: "/settings",
  icon: Settings2Icon,
}

/** `true` si la ruta actual pertenece al destino. */
export function isNavItemActive(pathname: string, url: string): boolean {
  return pathname === url || pathname.startsWith(`${url}/`)
}
