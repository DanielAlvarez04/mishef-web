import type { KitchenRound, Order, RoundStatus } from "@/lib/orders"

/** Rondas que todavía están en manos de cocina. */
export const KITCHEN_PROCESS_STATUSES: RoundStatus[] = [
  "PENDING",
  "HELD",
  "FIRED",
  "PREPARING",
]

/** Rondas que ya se pueden llevar a la mesa. */
export const KITCHEN_READY_STATUSES: RoundStatus[] = ["READY", "PICKED_UP"]

export function splitServiceRounds(rounds: KitchenRound[]) {
  const kitchen: KitchenRound[] = []
  const ready: KitchenRound[] = []

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
 * Cuentas abiertas con algo por cobrar.
 *
 * Las cuentas sin artículos todavía no generan un cobro pendiente.
 */
export function pendingPaymentOrders(orders: Order[]) {
  return orders.filter(
    (order) => Math.max(Number(order.balance ?? order.total), 0) > 0.004
  )
}
