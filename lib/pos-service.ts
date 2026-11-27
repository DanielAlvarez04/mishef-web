import type { Order, RoundStatus } from "@/lib/orders"

export interface GroupedServiceItem {
  key: string
  name: string
  quantity: number
}

/** Agrupa líneas iguales para mostrarlas en una sola fila. */
export function groupServiceItems(
  items: Array<{
    itemName: string
    variantName?: string | null
    quantity: number
  }>
): GroupedServiceItem[] {
  const grouped = new Map<string, GroupedServiceItem>()

  for (const item of items) {
    const name = item.variantName
      ? `${item.itemName} · ${item.variantName}`
      : item.itemName
    const key = name.toLocaleLowerCase("es")
    const current = grouped.get(key)

    if (current) {
      current.quantity += item.quantity
    } else {
      grouped.set(key, { key, name, quantity: item.quantity })
    }
  }

  return [...grouped.values()]
}

/** Agrupa el carrito de un borrador, que llega como JSON sin tipar. */
export function groupDraftCart(cart: unknown[]): GroupedServiceItem[] {
  const items: Array<{
    itemName: string
    variantName?: string | null
    quantity: number
  }> = []

  for (const entry of cart) {
    if (!entry || typeof entry !== "object") continue

    const line = entry as {
      itemName?: unknown
      variantName?: unknown
      quantity?: unknown
    }

    if (typeof line.itemName !== "string") continue

    items.push({
      itemName: line.itemName,
      variantName:
        typeof line.variantName === "string" ? line.variantName : null,
      quantity:
        typeof line.quantity === "number" && Number.isFinite(line.quantity)
          ? line.quantity
          : 1,
    })
  }

  return groupServiceItems(items)
}

/** Rondas que todavía están en manos de cocina. */
export const KITCHEN_PROCESS_STATUSES: RoundStatus[] = [
  "PENDING",
  "HELD",
  "FIRED",
  "PREPARING",
]

/** Rondas que ya se pueden llevar a la mesa. */
export const KITCHEN_READY_STATUSES: RoundStatus[] = ["READY", "PICKED_UP"]

export function splitServiceRounds<T extends { status: RoundStatus }>(
  rounds: T[]
) {
  const kitchen: T[] = []
  const ready: T[] = []

  for (const round of rounds) {
    if (KITCHEN_PROCESS_STATUSES.includes(round.status)) {
      kitchen.push(round)
    } else if (KITCHEN_READY_STATUSES.includes(round.status)) {
      ready.push(round)
    }
  }

  return { kitchen, ready }
}

/**
 * Cuentas abiertas que el POS debe mostrar.
 *
 * Incluye las que tienen saldo pendiente y las que ya tienen rondas (aunque
 * estén pagadas), para no perder de vista entregas ni cierres pendientes.
 * Las cuentas vacías sin saldo no se listan.
 */
export function openAccountOrders(orders: Order[]) {
  return orders.filter((order) => {
    if (order.status !== "OPEN") return false

    const balance = Math.max(Number(order.balance ?? order.total), 0)

    return balance > 0.004 || order.rounds.length > 0
  })
}
