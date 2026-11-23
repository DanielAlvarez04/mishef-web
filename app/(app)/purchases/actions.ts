"use server"

import { mutateApi, type ActionResult } from "@/lib/server-api"
import type { UnitCode } from "@/lib/catalog"
import type { PurchaseDetail, PurchaseItem } from "@/lib/purchases"

export interface TicketInput {
  documentKey: string
  documentMime?: string
  supplierId?: string
  purchasedAt?: string
  total?: number
}

export interface PresignedTicket {
  key: string
  contentType: string
  uploadUrl: string
}

/** Firma la subida directa de la foto del ticket a R2. */
export async function presignTicket(
  contentType: string,
  size: number
): Promise<ActionResult<PresignedTicket>> {
  return mutateApi("/purchases/tickets/presign", "POST", { contentType, size }, [])
}

/** Crea la compra con la foto y la deja lista para extraer. */
export async function createTicket(
  input: TicketInput
): Promise<ActionResult<{ id: string }>> {
  return mutateApi("/purchases/tickets", "POST", input, ["/purchases"])
}

/** Extrae las líneas del ticket con el modelo de visión. */
export async function extractTicket(
  id: string
): Promise<ActionResult<PurchaseDetail>> {
  return mutateApi(`/purchases/${id}/extract`, "POST", {}, [
    "/purchases",
    `/purchases/${id}`,
  ])
}

export interface PurchaseItemInput {
  id?: string
  rawDescription: string
  ingredientId?: string | null
  quantity: number
  unit: UnitCode
  unitCostGross: number
  lineTotalGross: number
  confidence?: number
  mappingSource?: string
}

export interface ReviewInput {
  supplierId?: string | null
  folio?: string | null
  purchasedAt?: string
  total?: number
  notes?: string | null
  items?: PurchaseItemInput[]
}

/** Guarda la revisión parcial (solo los campos que cambiaron). */
export async function reviewPurchase(
  id: string,
  input: ReviewInput
): Promise<ActionResult<PurchaseDetail>> {
  return mutateApi(`/purchases/${id}`, "PATCH", input, [
    "/purchases",
    `/purchases/${id}`,
  ])
}

/** Aprueba el ticket: crea un movimiento de inventario por línea. */
export async function approvePurchase(
  id: string
): Promise<ActionResult<PurchaseDetail>> {
  return mutateApi(`/purchases/${id}/approve`, "POST", {}, [
    "/purchases",
    `/purchases/${id}`,
    "/inventory",
  ])
}

/** Rechaza el ticket con un motivo opcional. */
export async function rejectPurchase(
  id: string,
  reason?: string
): Promise<ActionResult<PurchaseDetail>> {
  return mutateApi(`/purchases/${id}/reject`, "POST", { reason }, [
    "/purchases",
    `/purchases/${id}`,
  ])
}

export type { PurchaseItem }
