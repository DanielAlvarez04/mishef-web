"use server"

import { mutateApi, readApi, type ActionResult } from "@/lib/server-api"
import type {
  ChargeSummary,
  ConsumptionWarning,
  GuestAgeRange,
  GuestSex,
  GuestTitle,
  Order,
  OrderChannel,
  OrderGuest,
  OrderRound,
  RoundStatus,
  KitchenRound,
} from "@/lib/orders"
import type {
  KitchenTicketHistoryEntry,
  KitchenTicketStatus,
} from "@/lib/kitchen-tickets"

const ORDER_PATHS = ["/pos", "/kitchen"]

export interface RoundItemInput {
  itemId: string
  variantId?: string
  quantity: number
  notes?: string
  guestId?: string
  extras?: { extraId: string }[]
  options?: { itemOptionValueId: string }[]
  excludedIngredientIds?: string[]
}

export interface SendRoundInput {
  items: RoundItemInput[]
  idempotencyKey?: string
  /** Mantener la ronda en espera (modo Avanzado). */
  hold?: boolean
  /** Curso de la ronda (modo Avanzado). */
  courseId?: string
  /** Ronda de mostrador retenida hasta confirmar el pago. */
  paymentPending?: boolean
}

export interface CreateOrderGuestInput {
  name?: string
  title?: GuestTitle | null
  sex?: GuestSex | null
  ageRange?: GuestAgeRange | null
}

export interface CreateOrderInput {
  tableNumber?: string
  tableIds?: string[]
  partySize?: number
  isTakeaway?: boolean
  channel?: OrderChannel
  customerName?: string
  customerPhone?: string
  deliveryAddress?: string
  deliveryFee?: number
  scheduledAt?: string
  /** Personas de la cuenta. */
  guests?: CreateOrderGuestInput[]
  idempotencyKey?: string
  /**
   * Sincronización offline: si la mesa ya tiene una cuenta abierta en el
   * servidor, unirse a ella en vez de abrir otra.
   */
  reuseOpenTable?: boolean
}

export async function createOrder(
  input: CreateOrderInput
): Promise<ActionResult<Order>> {
  return mutateApi<Order>("/orders", "POST", input, ORDER_PATHS)
}

/**
 * Detalle de una cuenta con sus rondas y artículos.
 *
 * La lista de cuentas del POS llega con rondas resumidas (solo conteos), así
 * que el repaso de cobro pide el detalle al abrir el diálogo.
 */
export async function getOrderDetail(
  orderId: string
): Promise<ActionResult<Order>> {
  return readApi<Order>(`/orders/${orderId}`)
}

/**
 * Resumen ligero para el diálogo de cobro (artículos, clientes y partes).
 *
 * Evita el detalle completo (historial, extras, opciones y exclusiones), que
 * es lo que hacía lento el repaso.
 */
export async function getChargeSummary(
  orderId: string
): Promise<ActionResult<ChargeSummary>> {
  return readApi<ChargeSummary>(`/orders/${orderId}/charge-summary`)
}

export async function sendRound(
  orderId: string,
  input: SendRoundInput
): Promise<ActionResult<OrderRound & { warnings?: ConsumptionWarning[] }>> {
  return mutateApi<OrderRound & { warnings?: ConsumptionWarning[] }>(
    `/orders/${orderId}/rounds`,
    "POST",
    input,
    ORDER_PATHS
  )
}

/** Libera a cocina una ronda de mostrador ya pagada. */
export async function releasePaymentRound(
  orderId: string,
  roundId: string
): Promise<ActionResult<OrderRound>> {
  return mutateApi<OrderRound>(
    `/orders/${orderId}/rounds/${roundId}/release`,
    "POST",
    undefined,
    ORDER_PATHS
  )
}

/** Cambia o junta mesas libres de una cuenta abierta. */
export async function updateOrderTables(
  orderId: string,
  tableIds: string[]
): Promise<ActionResult<Order>> {
  return mutateApi<Order>(
    `/orders/${orderId}/tables`,
    "PATCH",
    { tableIds },
    ORDER_PATHS
  )
}

/** Junta dos cuentas abiertas de mesa. */
export async function mergeOrders(
  targetOrderId: string,
  sourceOrderId: string
): Promise<ActionResult<Order>> {
  return mutateApi<Order>(
    `/orders/${targetOrderId}/merge`,
    "POST",
    { sourceOrderId },
    ORDER_PATHS
  )
}

export async function transitionRound(
  orderId: string,
  roundId: string,
  status: RoundStatus,
  reason?: string
): Promise<ActionResult<OrderRound & { warnings?: ConsumptionWarning[] }>> {
  return mutateApi<OrderRound & { warnings?: ConsumptionWarning[] }>(
    `/orders/${orderId}/rounds/${roundId}/status`,
    "PATCH",
    { status, reason },
    ORDER_PATHS
  )
}

export async function cancelOrder(
  orderId: string,
  reason?: string
): Promise<ActionResult<Order>> {
  return mutateApi<Order>(
    `/orders/${orderId}/cancel`,
    "PATCH",
    { reason },
    ORDER_PATHS
  )
}

/** Cambia el estado de un ticket de estación (modo Avanzado). */
export async function transitionKitchenTicket(
  ticketId: string,
  status: KitchenTicketStatus,
  reason?: string
): Promise<ActionResult<unknown>> {
  return mutateApi(
    `/kitchen/tickets/${ticketId}/status`,
    "PATCH",
    { status, reason },
    ["/kitchen"]
  )
}

/** Rehace un ticket de estación: crea una comanda nueva con los mismos ítems. */
export async function refireKitchenTicket(
  ticketId: string
): Promise<ActionResult<unknown>> {
  return mutateApi(`/kitchen/tickets/${ticketId}/refire`, "POST", undefined, [
    "/kitchen",
  ])
}

/** Dispara una ronda retenida (modo Avanzado). */
export async function fireKitchenRound(
  roundId: string
): Promise<ActionResult<unknown>> {
  return mutateApi(`/kitchen/rounds/${roundId}/fire`, "POST", undefined, [
    "/kitchen",
  ])
}

/** Valida un ticket en el pase/expo. */
export async function expoValidateKitchenTicket(
  ticketId: string
): Promise<ActionResult<unknown>> {
  return mutateApi(`/kitchen/tickets/${ticketId}/expo`, "POST", undefined, [
    "/kitchen",
  ])
}

/** Historial detallado de un ticket. */
export async function getKitchenTicketHistory(
  ticketId: string
): Promise<ActionResult<KitchenTicketHistoryEntry[]>> {
  return readApi(`/kitchen/tickets/${ticketId}/history`)
}

/**
 * Rondas activas de cocina para el POS móvil.
 *
 * Incluye cuentas ya cobradas que siguen en preparación; por eso no se usa la
 * lista de cuentas abiertas del POS.
 */
export async function getKitchenRounds(): Promise<ActionResult<KitchenRound[]>> {
  return readApi<KitchenRound[]>("/kitchen/rounds")
}

/** Añade una persona (comensal) a la cuenta. */
export async function addOrderGuest(
  orderId: string,
  input: CreateOrderGuestInput
): Promise<ActionResult<OrderGuest>> {
  return mutateApi<OrderGuest>(
    `/orders/${orderId}/guests`,
    "POST",
    input,
    ORDER_PATHS
  )
}

/** Edita el nombre y/o tratamiento de una persona de la cuenta. */
export async function updateOrderGuest(
  orderId: string,
  guestId: string,
  input: CreateOrderGuestInput
): Promise<ActionResult<OrderGuest>> {
  return mutateApi<OrderGuest>(
    `/orders/${orderId}/guests/${guestId}`,
    "PATCH",
    input,
    ORDER_PATHS
  )
}

/** Quita una persona de la cuenta (sus líneas conservan el nombre). */
export async function removeOrderGuest(
  orderId: string,
  guestId: string
): Promise<ActionResult> {
  return mutateApi(
    `/orders/${orderId}/guests/${guestId}`,
    "DELETE",
    undefined,
    ORDER_PATHS
  )
}
