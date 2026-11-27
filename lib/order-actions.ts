"use server"

import { mutateApi, readApi, type ActionResult } from "@/lib/server-api"
import type {
  ChargeSummary,
  ComandaDetail,
  ConsumptionWarning,
  GuestAgeRange,
  GuestSex,
  GuestTitle,
  Order,
  OrderChannel,
  OrderGuest,
  OrderRound,
  OrderTableUpdate,
  RoundStatus,
  KitchenRound,
  KitchenRoundSummary,
} from "@/lib/orders"
import type {
  KitchenTicketHistoryEntry,
  KitchenTicketStatus,
} from "@/lib/kitchen-tickets"

const KITCHEN_PATHS = ["/kitchen"]

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
  return mutateApi<Order>("/orders", "POST", input, [])
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

/** Detalle ligero de la comanda: solo rondas y artículos. */
export async function getComandaDetail(
  orderId: string
): Promise<ActionResult<ComandaDetail>> {
  return readApi<ComandaDetail>(`/orders/${orderId}/comanda`)
}

/** Lista mínima de cuentas abiertas para actualizar el POS sin recargar la ruta. */
export async function listOpenOrders(): Promise<ActionResult<Order[]>> {
  return readApi<Order[]>("/orders?status=OPEN")
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
    KITCHEN_PATHS
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
    KITCHEN_PATHS
  )
}

/** Cambia o junta mesas libres de una cuenta abierta. */
export async function updateOrderTables(
  orderId: string,
  tableIds: string[]
): Promise<ActionResult<OrderTableUpdate>> {
  return mutateApi<OrderTableUpdate>(
    `/orders/${orderId}/tables`,
    "PATCH",
    { tableIds },
    KITCHEN_PATHS
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
    KITCHEN_PATHS
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
    KITCHEN_PATHS
  )
}

/** Marca una ronda para que cocina la atienda primero. */
export async function prioritizeRound(
  orderId: string,
  roundId: string
): Promise<ActionResult<OrderRound>> {
  return mutateApi<OrderRound>(
    `/orders/${orderId}/rounds/${roundId}/prioritize`,
    "POST",
    undefined,
    KITCHEN_PATHS
  )
}

/** Entrega una ronda desde el POS (modo General o Avanzado). */
export async function deliverRoundFromPos(
  orderId: string,
  roundId: string
): Promise<ActionResult<OrderRound>> {
  return mutateApi<OrderRound>(
    `/orders/${orderId}/rounds/${roundId}/deliver`,
    "POST",
    undefined,
    KITCHEN_PATHS
  )
}

/** Cancela una ronda desde el POS (modo General o Avanzado). */
export async function cancelRoundFromPos(
  orderId: string,
  roundId: string
): Promise<ActionResult<OrderRound>> {
  return mutateApi<OrderRound>(
    `/orders/${orderId}/rounds/${roundId}/cancel-round`,
    "POST",
    undefined,
    KITCHEN_PATHS
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
    KITCHEN_PATHS
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

/** Contadores del POS sin artículos; el detalle se pide al abrir la bandeja. */
export async function getKitchenRoundsSummary(): Promise<
  ActionResult<KitchenRoundSummary[]>
> {
  return readApi<KitchenRoundSummary[]>("/kitchen/rounds?summary=1")
}

/** Ajusta el número de comensales y crea/elimina los que falten en lote. */
export async function setOrderPartySize(
  orderId: string,
  partySize: number
): Promise<ActionResult<OrderGuest[]>> {
  return mutateApi<OrderGuest[]>(
    `/orders/${orderId}/party-size`,
    "PATCH",
    { partySize },
    []
  )
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
    []
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
    KITCHEN_PATHS
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
    []
  )
}
