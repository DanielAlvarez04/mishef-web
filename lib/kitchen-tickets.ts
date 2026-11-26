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
  station: { id: string; name: string; code: string; color: string | null }
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
}

export interface KitchenBoard {
  mode: "GENERAL" | "ADVANCED"
  stations: KitchenStationSummary[]
  tickets: KitchenTicket[]
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
