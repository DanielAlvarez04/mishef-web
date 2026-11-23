"use server"

import { mutateApi, type ActionResult } from "@/lib/server-api"
import type {
  Order,
  Payment,
  PaymentMethod,
  TipSource,
} from "@/lib/orders"

/**
 * Rutas que se revalidan tras un cobro.
 *
 * `/pos` queda fuera a propósito: el diálogo de cobro actualiza su saldo en
 * cliente y el POS se refresca una sola vez al cerrarlo. Revalidar aquí
 * re-renderizaba catálogo y cuentas en cada pago.
 */
const PAYMENT_PATHS = ["/dashboard", "/reports"]

export interface RegisterPaymentInput {
  method: PaymentMethod
  amount: number
  tipAmount?: number
  tipPercent?: number | null
  tipSource?: TipSource
  tipBaseAmount?: number | null
  tipRecipientId?: string
  cashReceived?: number
  changeGiven?: number
  /** Parte de una cuenta dividida a la que se aplica el pago. */
  splitId?: string
  /** Referencia externa del cobro (autorización, voucher o terminal ajena). */
  reference?: string
  /** Registra y confirma en una sola petición (roles con permiso). */
  confirm?: boolean
  idempotencyKey?: string
}

/** Cobro con tarjeta capturado sin conexión. Queda pendiente de conciliar. */
export interface RegisterOfflineCardInput {
  amount: number
  tipAmount?: number
  tipPercent?: number | null
  tipSource?: TipSource
  tipBaseAmount?: number | null
  reference: string
  deviceId: string
  createdOfflineAt?: string
  idempotencyKey: string
}

export interface ReconcilePaymentInput {
  resolution: "CONFIRM" | "REJECT"
  reason?: string
  closeOrder?: boolean
}

export interface ReconcilePaymentResult {
  payment: Payment
  closed: boolean
  closeMessage: string | null
}

/** Registra un pago pendiente sobre una cuenta abierta. */
export async function registerPayment(
  orderId: string,
  input: RegisterPaymentInput
): Promise<ActionResult<Payment>> {
  return mutateApi<Payment>(
    `/orders/${orderId}/payments`,
    "POST",
    input,
    PAYMENT_PATHS
  )
}

/**
 * Registra un cobro con tarjeta capturado sin conexión.
 *
 * No lo confirma: queda PENDING y marcado para conciliación. La cuenta no se
 * cierra hasta que un rol autorizado lo confirme.
 */
export async function registerOfflineCardPayment(
  orderId: string,
  input: RegisterOfflineCardInput
): Promise<ActionResult<Payment>> {
  return mutateApi<Payment>(
    `/orders/${orderId}/payments/offline-card`,
    "POST",
    input,
    PAYMENT_PATHS
  )
}

/** Confirma o rechaza un cobro offline desde la cola de conciliación. */
export async function reconcilePayment(
  paymentId: string,
  input: ReconcilePaymentInput
): Promise<ActionResult<ReconcilePaymentResult>> {
  return mutateApi<ReconcilePaymentResult>(
    `/payments/${paymentId}/reconcile`,
    "POST",
    input,
    PAYMENT_PATHS
  )
}

/** Confirma un pago pendiente (acción explícita y autorizada). */
export async function confirmPayment(
  paymentId: string
): Promise<ActionResult<Payment>> {
  return mutateApi<Payment>(
    `/payments/${paymentId}/confirm`,
    "POST",
    undefined,
    PAYMENT_PATHS
  )
}

/** Anula un pago pendiente o reembolsa uno confirmado (solo ADMIN). */
export async function voidPayment(
  paymentId: string,
  reason: string
): Promise<ActionResult<Payment>> {
  return mutateApi<Payment>(
    `/payments/${paymentId}/void`,
    "POST",
    { reason },
    PAYMENT_PATHS
  )
}

/** Cierra una cuenta cuyo total ya está cubierto por pagos confirmados. */
export async function closeOrder(
  orderId: string
): Promise<ActionResult<Order>> {
  return mutateApi<Order>(
    `/orders/${orderId}/close`,
    "POST",
    undefined,
    PAYMENT_PATHS
  )
}
