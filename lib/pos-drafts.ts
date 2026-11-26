"use server"

import { mutateApi, readApi, type ActionResult } from "@/lib/server-api"
import type { GuestAgeRange, GuestSex, OrderChannel } from "@/lib/orders"

/**
 * Captura del POS guardada sin abrir cuenta.
 *
 * El borrador vive en el servidor, lo ve todo el personal de la sucursal y
 * caduca a los 15 minutos. No ocupa mesa ni envía nada a cocina.
 */
export interface PosDraft {
  id: string
  orderId: string | null
  channel: OrderChannel
  tableNumber: string | null
  tableId: string | null
  customerName: string | null
  customerPhone: string | null
  customerSex: GuestSex | null
  customerAgeRange: GuestAgeRange | null
  deliveryAddress: string | null
  deliveryFee: string
  partySize: number
  /** Líneas del carrito tal como las capturó el POS. */
  cart: unknown[]
  /** Comensales capturados. */
  guests: unknown[]
  total: string
  itemCount: number
  expiresAt: string
  createdAt: string
  createdByName: string | null
}

export interface CreatePosDraftInput {
  orderId?: string
  channel?: OrderChannel
  tableNumber?: string
  tableId?: string
  customerName?: string
  customerPhone?: string
  customerSex?: GuestSex | null
  customerAgeRange?: GuestAgeRange | null
  deliveryAddress?: string
  deliveryFee?: number
  partySize?: number
  cart: unknown[]
  guests?: unknown[]
  total?: number
}

const POS_PATHS = ["/pos"]

export async function createPosDraft(
  input: CreatePosDraftInput
): Promise<ActionResult<PosDraft>> {
  return mutateApi<PosDraft>("/pos/drafts", "POST", input, POS_PATHS)
}

export async function listPosDrafts(): Promise<ActionResult<PosDraft[]>> {
  return readApi<PosDraft[]>("/pos/drafts")
}

/** Reanuda y consume el borrador: no puede reanudarse dos veces. */
export async function resumePosDraft(
  id: string
): Promise<ActionResult<PosDraft>> {
  return mutateApi<PosDraft>(
    `/pos/drafts/${id}/resume`,
    "POST",
    undefined,
    POS_PATHS
  )
}

export async function deletePosDraft(
  id: string
): Promise<ActionResult<{ id: string; deleted: boolean }>> {
  return mutateApi<{ id: string; deleted: boolean }>(
    `/pos/drafts/${id}`,
    "DELETE",
    undefined,
    POS_PATHS
  )
}
