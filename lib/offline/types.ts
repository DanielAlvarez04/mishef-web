import type { TipSource } from "@/lib/orders"

/**
 * Operaciones que la PWA guarda sin conexión (plan.md §7.1).
 *
 * Se encolan comandas, cobros en efectivo, cobros con tarjeta pendientes de
 * conciliar y cierres de caja. Un cobro con tarjeta nunca se marca como
 * confirmado sin respuesta del proveedor o revisión humana.
 */

export type QueuedRoundStatus = "queued" | "syncing" | "error"

export type OfflineOperationKind = "round" | "checkout" | "cash_close" | "ticket"

export interface QueuedRoundItem {
  itemId: string
  variantId?: string
  quantity: number
  notes?: string
  extras?: { extraId: string }[]
  excludedIngredientIds?: string[]
}

interface QueuedOperationBase {
  id: string
  userId: string
  kind: OfflineOperationKind
  status: QueuedRoundStatus
  createdAt: number
  updatedAt: number
  attempts: number
  lastError?: string
  /** Texto corto para la interfaz ("Mesa 4 · 3 líneas"). */
  label: string
  /** Importe visible en la cola: venta o efectivo contado. */
  total: number
}

export interface QueuedRound extends QueuedOperationBase {
  kind: "round"
  /** Cuenta ya abierta en el servidor, si la había al encolar. */
  orderId?: string
  order: {
    tableNumber?: string
    isTakeaway: boolean
    idempotencyKey: string
  }
  round: {
    items: QueuedRoundItem[]
    idempotencyKey: string
  }
}

/**
 * Venta cobrada en efectivo sin conexión.
 *
 * Puede referenciar una cuenta existente (`orderId`) o crear la cuenta y
 * enviar la ronda en el mismo lote (`order` + `round`). El pago se registra y
 * confirma con `idempotencyKey`; el cierre de la cuenta va después.
 */
export interface QueuedCheckout extends QueuedOperationBase {
  kind: "checkout"
  orderId?: string
  order?: {
    tableNumber?: string
    isTakeaway: boolean
    idempotencyKey: string
  }
  round?: {
    items: QueuedRoundItem[]
    idempotencyKey: string
  }
  payment: {
    /** Efectivo confirmado o tarjeta pendiente de conciliar. */
    method: "CASH" | "CARD"
    amount: number
    tipAmount: number
    tipPercent?: number | null
    tipBaseAmount?: number | null
    tipSource: TipSource
    cashReceived?: number
    changeGiven?: number
    /** Voucher o autorización de la terminal (solo tarjeta). */
    reference?: string
    /** Identificador local del dispositivo (solo tarjeta). */
    deviceId?: string
    /** Hora local de captura, en milisegundos (solo tarjeta). */
    createdOfflineAt?: number
    idempotencyKey: string
  }
  closeOrder: boolean
}

/** Cierre de caja guardado en el dispositivo. */
export interface QueuedCashClose extends QueuedOperationBase {
  kind: "cash_close"
  sessionId: string
  countedCash: number
  notes?: string
  idempotencyKey: string
}

/**
 * Foto de un ticket de compra guardada en el dispositivo.
 *
 * El archivo se conserva como `Blob` en IndexedDB. Al sincronizar se firma la
 * subida, se manda directo a R2 y se dispara la extracción; si la extracción
 * falla, la compra queda en revisión para capturarla a mano.
 */
export interface QueuedTicket extends QueuedOperationBase {
  kind: "ticket"
  file: Blob
  fileName: string
  mimeType: string
  size: number
}

export type QueuedOperation =
  | QueuedRound
  | QueuedCheckout
  | QueuedCashClose
  | QueuedTicket

export const QUEUED_STATUS_LABELS: Record<QueuedRoundStatus, string> = {
  queued: "Pendiente de sincronizar",
  syncing: "Sincronizando",
  error: "Error: requiere intervención",
}
