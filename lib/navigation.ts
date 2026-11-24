import type { FeatureKey } from "@/lib/features"
import { isFeatureEnabled } from "@/lib/features"
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
  SlidersHorizontalIcon,
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
  /** Función que debe estar activa en la organización. */
  feature?: FeatureKey
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
    feature: "dashboard",
  },
  {
    title: "Menús",
    url: "/menus",
    icon: NotebookTextIcon,
    roles: ["ADMIN", "WAITER", "INVENTORY_MANAGER"],
    feature: "menus",
  },
  {
    title: "Punto de venta",
    mobileTitle: "POS",
    url: "/pos",
    icon: ShoppingBasketIcon,
    roles: SERVICE,
    feature: "pos",
  },
  {
    title: "Cocina",
    url: "/kitchen",
    icon: ChefHatIcon,
    roles: ["ADMIN", "WAITER", "KITCHEN"],
    feature: "kitchen",
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
    title: "Catálogo",
    url: "/catalog",
    icon: CookingPotIcon,
    roles: CATALOG,
    feature: "catalog",
  },
  {
    title: "Inventario",
    url: "/inventory",
    icon: PackageIcon,
    roles: CATALOG,
    feature: "inventory",
  },
  {
    title: "Reportes",
    url: "/reports",
    icon: ChartBarIcon,
    feature: "reports",
  },
  {
    title: "Food cost",
    url: "/reports/food-cost",
    icon: PercentIcon,
    roles: ["ADMIN", "CASHIER", "INVENTORY_MANAGER"],
    feature: "reports.food-cost",
  },
  {
    title: "Fuga interna",
    url: "/reports/leakage",
    icon: ShieldAlertIcon,
    roles: MONEY,
    feature: "reports.leakage",
  },
  {
    title: "Asistencia",
    url: "/attendance",
    icon: ClockIcon,
    feature: "attendance",
  },
  {
    title: "Merma",
    url: "/waste",
    icon: Trash2Icon,
    roles: CATALOG,
    feature: "waste",
  },
  {
    title: "Benchmark",
    url: "/reports/benchmark",
    icon: BarChart3Icon,
    roles: MONEY,
    feature: "reports.benchmark",
  },
]

/** Grupo «Plataforma» del superadmin. */
export const PLATFORM_NAV: NavItem[] = [
  { title: "Resumen", url: "/platform", icon: LayoutDashboardIcon },
  { title: "Funciones", url: "/platform/features", icon: SlidersHorizontalIcon },
  { title: "Planes", url: "/plans", icon: BadgeDollarSignIcon },
  { title: "Suscripciones", url: "/subscriptions", icon: StoreIcon },
  { title: "Usuarios", url: "/users", icon: UsersIcon },
]

/** Acceso a Configuración desde el sidebar. */
export const SETTINGS_NAV: NavItem = {
  title: "Configuración",
  url: "/settings",
  icon: Settings2Icon,
  feature: "settings",
}

/**
 * `true` si el usuario puede ver el destino según sus roles y las funciones
 * activas de la organización.
 */
export function canSeeNavItem(
  item: NavItem,
  roles: readonly string[],
  features: Record<string, boolean> = {}
): boolean {
  if (item.feature && !isFeatureEnabled(features, item.feature)) return false
  if (!item.roles || item.roles.length === 0) return true
  return roles.some((role) => item.roles?.includes(role))
}

/** `true` si la ruta actual pertenece al destino. */
export function isNavItemActive(pathname: string, url: string): boolean {
  return pathname === url || pathname.startsWith(`${url}/`)
}
