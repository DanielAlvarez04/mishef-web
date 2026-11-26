/** Tipos del tablero de tickets por estación (modo Avanzado). */

export type KitchenTicketStatus =
  | "PENDING"
  | "PREPARING"
  | "READY"
  | "PICKED_UP"
  | "DELIVERED"
  | "CANCELLED"

export interface KitchenTicketItem {
  id: string
  status: string
  orderItem: {
    id: string
    itemName: string
    variantName: string | null
    quantity: number
    notes: string | null
    guestName: string | null
    extras: Array<{ id: string; extraName: string }>
    options: Array<{ id: string; optionName: string; kitchenLabel: string | null }>
    exclusions: Array<{
      id: string
      ingredient: { id: string; name: string }
    }>
  }
}

export interface KitchenTicket {
  id: string
  status: KitchenTicketStatus
  createdAt: string
  startedAt: string | null
  readyAt: string | null
  pickedUpAt: string | null
  deliveredAt: string | null
  cancelledAt?: string | null
  cancelReason?: string | null
  expoAt: string | null
  expoValidatedByName: string | null
  station: {
    id: string
    name: string
    code: string
    color: string | null
    slaMinutes: number | null
  }
  assignedMembership: {
    id: string
    user: { name: string | null; username: string | null }
  } | null
  items: KitchenTicketItem[]
  orderRound: {
    id: string
    sentAt: string | null
    createdAt: string
    orderId: string
    estimatedMinutes: number | null
    order: {
      id: string
      tableNumber: string | null
      channel: string
      customerName: string | null
      isTakeaway: boolean
      branchId: string | null
      status: string
    }
  }
}

export interface KitchenStationSummary {
  id: string
  name: string
  code: string
  color: string | null
  type: string
  sortOrder: number
  slaMinutes: number | null
}

export interface HeldRound {
  id: string
  createdAt: string
  sentAt: string | null
  course: { id: string; name: string } | null
  order: {
    id: string
    tableNumber: string | null
    channel: string
    customerName: string | null
  }
  items: Array<{
    id: string
    itemName: string
    variantName: string | null
    quantity: number
    notes: string | null
  }>
}

export interface KitchenTicketHistoryEntry {
  id: string
  previousStatus: KitchenTicketStatus | null
  newStatus: KitchenTicketStatus
  changedById: string | null
  changedByName: string | null
  changedAt: string
  reason: string | null
}

export interface KitchenBoard {
  mode: "GENERAL" | "ADVANCED"
  stations: KitchenStationSummary[]
  tickets: KitchenTicket[]
  heldRounds: HeldRound[]
  /** Tickets entregados o anulados en las últimas 4 horas. */
  recentTickets: KitchenTicket[]
}

export const KITCHEN_TICKET_STATUS_LABELS: Record<
  KitchenTicketStatus,
  string
> = {
  PENDING: "Pendiente",
  PREPARING: "En preparación",
  READY: "Listo",
  PICKED_UP: "Recogido",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
}

export function kitchenOrderLabel(ticket: KitchenTicket): string {
  const order = ticket.orderRound.order

  if (order.tableNumber) return `Mesa ${order.tableNumber}`
  if (order.channel === "COUNTER") return "Mostrador"
  if (order.channel === "PHONE") return "Teléfono"
  if (order.channel === "DELIVERY") return "Domicilio"
  return "Pedido"
}
