import type { TipSource } from "@/lib/orders"

/**
 * Operaciones que la PWA guarda sin conexión (plan.md §7.1).
 *
 * Se encolan comandas, cobros en efectivo y cierres de caja. Nunca se encola
 * un cobro con tarjeta ni una confirmación de proveedor: esos movimientos
 * necesitan respuesta en línea para no cobrar dos veces.
 */

export type QueuedRoundStatus = "queued" | "syncing" | "error"

export type OfflineOperationKind = "round" | "checkout" | "cash_close"

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
    amount: number
    tipAmount: number
    tipPercent?: number | null
    tipBaseAmount?: number | null
    tipSource: TipSource
    cashReceived: number
    changeGiven?: number
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

export type QueuedOperation = QueuedRound | QueuedCheckout | QueuedCashClose

export const QUEUED_STATUS_LABELS: Record<QueuedRoundStatus, string> = {
  queued: "Pendiente de sincronizar",
  syncing: "Sincronizando",
  error: "Error: requiere intervención",
}
