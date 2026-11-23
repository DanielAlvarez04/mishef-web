import {
  BarChart3Icon,
  BadgeDollarSignIcon,
  BellIcon,
  ChartBarIcon,
  ChefHatIcon,
  ClockIcon,
  CookingPotIcon,
  LayoutDashboardIcon,
  NotebookTextIcon,
  PackageIcon,
  PercentIcon,
  ReceiptTextIcon,
  Settings2Icon,
  ShieldAlertIcon,
  ShoppingBasketIcon,
  SparklesIcon,
  StoreIcon,
  Trash2Icon,
  TruckIcon,
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
const PURCHASES: string[] = ["ADMIN", "SUPERVISOR", "INVENTORY_MANAGER"]
const INTEL: string[] = ["ADMIN", "SUPERVISOR", "INVENTORY_MANAGER"]

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

/**
 * Orden de «Servicio» en el sidebar de escritorio y en el riel horizontal.
 *
 * La barra inferior vertical conserva el orden de `SERVICE_NAV` (el POS va al
 * centro de la barra).
 */
const SERVICE_DESKTOP_ORDER = new Map(
  ["/dashboard", "/pos", "/kitchen", "/menus"].map((url, index) => [url, index])
)

export function sortServiceNav<T extends { url: string }>(items: T[]): T[] {
  return [...items].sort(
    (left, right) =>
      (SERVICE_DESKTOP_ORDER.get(left.url) ?? Number.MAX_SAFE_INTEGER) -
      (SERVICE_DESKTOP_ORDER.get(right.url) ?? Number.MAX_SAFE_INTEGER)
  )
}

/** Grupo «Aplicación»: solo en el sidebar completo. */
export const APPLICATION_NAV: NavItem[] = [
  {
    title: "Intel",
    url: "/intel",
    icon: SparklesIcon,
    roles: INTEL,
  },
  {
    title: "Bandeja",
    url: "/intel/notifications",
    icon: BellIcon,
    roles: INTEL,
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
    title: "Compras",
    url: "/purchases",
    icon: ReceiptTextIcon,
    roles: PURCHASES,
  },
  {
    title: "Proveedores",
    url: "/suppliers",
    icon: TruckIcon,
    roles: PURCHASES,
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
