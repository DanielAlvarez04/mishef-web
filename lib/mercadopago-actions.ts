"use server"

import { mutateApi, type ActionResult } from "@/lib/server-api"
import type {
  MercadoPagoTerminal,
  MercadoPagoTerminalModel,
} from "@/lib/mercadopago"
import type { Payment, TipSource } from "@/lib/orders"

const SETTINGS_PATHS = ["/settings"]
/** Cobros con terminal: el POS se sincroniza al cerrar el diálogo. */
const POINT_PATHS = ["/dashboard", "/reports"]

export async function disconnectMercadoPago(): Promise<ActionResult> {
  return mutateApi("/mercadopago/connection", "DELETE", undefined, SETTINGS_PATHS)
}

export async function syncMercadoPagoTerminals(): Promise<
  ActionResult<MercadoPagoTerminal[]>
> {
  return mutateApi<MercadoPagoTerminal[]>(
    "/mercadopago/terminals/sync",
    "POST",
    undefined,
    SETTINGS_PATHS
  )
}

export interface TerminalUpdateInput {
  branchId?: string | null
  model?: MercadoPagoTerminalModel | null
  isDefault?: boolean
}

export async function updateMercadoPagoTerminal(
  id: string,
  input: TerminalUpdateInput
): Promise<ActionResult<MercadoPagoTerminal>> {
  if (!id) {
    return { ok: false, message: "Terminal no encontrada." }
  }

  return mutateApi<MercadoPagoTerminal>(
    `/mercadopago/terminals/${id}`,
    "PATCH",
    input,
    SETTINGS_PATHS
  )
}

export async function setMercadoPagoTerminalMode(
  id: string,
  operatingMode: "PDV" | "SELF_SERVICE"
): Promise<ActionResult<MercadoPagoTerminal>> {
  if (!id) {
    return { ok: false, message: "Terminal no encontrada." }
  }

  return mutateApi<MercadoPagoTerminal>(
    `/mercadopago/terminals/${id}/mode`,
    "PATCH",
    { operatingMode },
    SETTINGS_PATHS
  )
}

/** Pago local creado al enviar un cobro a la terminal. */
export type PointPayment = Payment

export interface PointChargeInput {
  amount: number
  terminalId?: string
  idempotencyKey: string
  /** Parte de la cuenta a la que se aplica el cobro. */
  splitId?: string
  /** Propina incluida en el mismo cobro de la terminal. */
  tipAmount?: number
  tipPercent?: number | null
  tipSource?: TipSource
  tipBaseAmount?: number | null
}

export async function chargeWithPoint(
  orderId: string,
  input: PointChargeInput
): Promise<ActionResult<PointPayment>> {
  if (!orderId) {
    return { ok: false, message: "Cuenta no encontrada." }
  }

  return mutateApi<PointPayment>(
    `/orders/${orderId}/payments/point`,
    "POST",
    input,
    POINT_PATHS
  )
}

export async function syncPointPayment(
  paymentId: string
): Promise<ActionResult<PointPayment>> {
  if (!paymentId) {
    return { ok: false, message: "Pago no encontrado." }
  }

  return mutateApi<PointPayment>(
    `/payments/${paymentId}/sync`,
    "POST",
    undefined,
    POINT_PATHS
  )
}

export async function cancelPointCharge(
  paymentId: string
): Promise<ActionResult<PointPayment>> {
  if (!paymentId) {
    return { ok: false, message: "Pago no encontrado." }
  }

  return mutateApi<PointPayment>(
    `/payments/${paymentId}/cancel-point`,
    "POST",
    undefined,
    POINT_PATHS
  )
}

export interface PointReceiptResult {
  actionId: string
  status: string
  terminalId: string
}

/**
 * Manda el ticket itemizado a la terminal Point.
 *
 * Funciona para cualquier método de pago: el recibo se arma en la API y se
 * imprime en la terminal de la sucursal (Point Smart 1/2).
 */
export async function printOrderReceipt(
  orderId: string
): Promise<ActionResult<PointReceiptResult>> {
  if (!orderId) {
    return { ok: false, message: "Cuenta no encontrada." }
  }

  return mutateApi<PointReceiptResult>(
    `/orders/${orderId}/receipt`,
    "POST",
    undefined
  )
}

/** Pago con link de Checkout Pro. */
export type LinkPayment = Payment & {
  providerCheckoutUrl?: string | null
}

export type LinkChargeInput = PointChargeInput

export async function createPaymentLink(
  orderId: string,
  input: LinkChargeInput
): Promise<ActionResult<LinkPayment>> {
  if (!orderId) {
    return { ok: false, message: "Cuenta no encontrada." }
  }

  return mutateApi<LinkPayment>(
    `/orders/${orderId}/payments/link`,
    "POST",
    input,
    POINT_PATHS
  )
}

export async function syncLinkPayment(
  paymentId: string
): Promise<ActionResult<LinkPayment>> {
  if (!paymentId) {
    return { ok: false, message: "Pago no encontrado." }
  }

  return mutateApi<LinkPayment>(
    `/payments/${paymentId}/sync-link`,
    "POST",
    undefined,
    POINT_PATHS
  )
}

export async function cancelLinkPayment(
  paymentId: string
): Promise<ActionResult<LinkPayment>> {
  if (!paymentId) {
    return { ok: false, message: "Pago no encontrado." }
  }

  return mutateApi<LinkPayment>(
    `/payments/${paymentId}/cancel-link`,
    "POST",
    undefined,
    POINT_PATHS
  )
}
