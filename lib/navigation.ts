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
  SparklesIcon,
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
  /** Roles que pueden ver el destino. Sin lista = todos los miembros. */
  roles?: string[]
}

const CATALOG: string[] = ["ADMIN", "INVENTORY_MANAGER"]
const MONEY: string[] = ["ADMIN", "CASHIER"]
const SERVICE: string[] = ["ADMIN", "WAITER", "CASHIER"]

/** Grupo «Servicio»: es el que aparece en la barra inferior. */
export const SERVICE_NAV: NavItem[] = [
  {
    title: "Dashboard",
    mobileTitle: "Inicio",
    url: "/dashboard",
    icon: LayoutDashboardIcon,
  },
  {
    title: "Menús",
    url: "/menus",
    icon: NotebookTextIcon,
    roles: ["ADMIN", "WAITER", "INVENTORY_MANAGER"],
  },
  {
    title: "Punto de venta",
    mobileTitle: "POS",
    url: "/pos",
    icon: ShoppingBasketIcon,
    roles: SERVICE,
  },
  {
    title: "Cocina",
    url: "/kitchen",
    icon: ChefHatIcon,
    roles: ["ADMIN", "WAITER", "KITCHEN"],
  },
]

/** Grupo «Aplicación»: solo en el sidebar completo. */
export const APPLICATION_NAV: NavItem[] = [
  {
    title: "Intel",
    url: "/intel",
    icon: SparklesIcon,
    roles: ["ADMIN", "INVENTORY_MANAGER"],
  },
  {
    title: "Catálogo",
    url: "/catalog",
    icon: CookingPotIcon,
    roles: CATALOG,
  },
  {
    title: "Inventario",
    url: "/inventory",
    icon: PackageIcon,
    roles: CATALOG,
  },
  {
    title: "Reportes",
    url: "/reports",
    icon: ChartBarIcon,
  },
  {
    title: "Food cost",
    url: "/reports/food-cost",
    icon: PercentIcon,
    roles: ["ADMIN", "CASHIER", "INVENTORY_MANAGER"],
  },
  {
    title: "Fuga interna",
    url: "/reports/leakage",
    icon: ShieldAlertIcon,
    roles: MONEY,
  },
  {
    title: "Asistencia",
    url: "/attendance",
    icon: ClockIcon,
  },
  {
    title: "Merma",
    url: "/waste",
    icon: Trash2Icon,
    roles: CATALOG,
  },
  {
    title: "Benchmark",
    url: "/reports/benchmark",
    icon: BarChart3Icon,
    roles: MONEY,
  },
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

/** `true` si el usuario puede ver el destino según sus roles. */
export function canSeeNavItem(
  item: NavItem,
  roles: readonly string[]
): boolean {
  if (!item.roles || item.roles.length === 0) return true
  return roles.some((role) => item.roles?.includes(role))
}

/** `true` si la ruta actual pertenece al destino. */
export function isNavItemActive(pathname: string, url: string): boolean {
  return pathname === url || pathname.startsWith(`${url}/`)
}
