import type { ActionResult } from "@/lib/server-api"
import type { Order } from "@/lib/orders"
import type { QueuedRound, QueuedRoundItem } from "./types"

/**
 * Sincronización de una comanda encolada.
 *
 * Vive fuera del componente para poder probarla sin navegador: el proveedor
 * solo aporta las llamadas reales y los avisos.
 *
 * Reglas:
 *  - Si la cuenta no existe, se crea con `reuseOpenTable` para unirse a una
 *    mesa que otro dispositivo ya abrió.
 *  - Un fallo de red deja la operación en cola (se reintenta sola).
 *  - Un rechazo del servidor la marca como error (requiere intervención).
 *  - La ronda se envía con su propia clave de idempotencia: reenviarla no
 *    duplica nada.
 */

export type SyncOutcome = "done" | "error" | "offline"

export interface SyncResult {
  outcome: SyncOutcome
  /** `true` si la cuenta se unió a una mesa ya abierta en el servidor. */
  reconciled: boolean
  orderId: string | null
  /** El cobro con tarjeta quedó registrado y espera conciliación. */
  pendingReview?: boolean
  /** La cuenta quedó abierta porque faltan rondas por entregar. */
  closeDeferred?: boolean
  message?: string
}

export interface SyncDeps {
  createOrder: (input: {
    tableNumber?: string
    isTakeaway: boolean
    idempotencyKey: string
    reuseOpenTable: true
  }) => Promise<ActionResult<Order>>
  sendRound: (
    orderId: string,
    input: { items: QueuedRoundItem[]; idempotencyKey: string },
  ) => Promise<ActionResult<unknown>>
  persist: (operation: QueuedRound) => Promise<void>
  remove: (id: string) => Promise<void>
}

export async function syncQueuedRound(
  operation: QueuedRound,
  deps: SyncDeps,
): Promise<SyncResult> {
  const attempt: QueuedRound = {
    ...operation,
    status: "syncing",
    attempts: operation.attempts + 1,
    updatedAt: Date.now(),
  }

  await deps.persist(attempt)

  let orderId: string | null = attempt.orderId ?? null
  let reconciled = false

  try {
    if (!orderId) {
      const created = await deps.createOrder({
        tableNumber: attempt.order.tableNumber,
        isTakeaway: attempt.order.isTakeaway,
        idempotencyKey: attempt.order.idempotencyKey,
        reuseOpenTable: true,
      })

      if (!created.ok || !created.data) {
        return fail(attempt, created, deps, orderId, reconciled)
      }

      reconciled = created.data.reconciled === true
      orderId = created.data.id
      await deps.persist({ ...attempt, orderId })
    }

    const sent = await deps.sendRound(orderId, {
      items: attempt.round.items,
      idempotencyKey: attempt.round.idempotencyKey,
    })

    if (!sent.ok) {
      return fail(attempt, sent, deps, orderId, reconciled)
    }

    await deps.remove(attempt.id)

    return { outcome: "done", reconciled, orderId }
  } catch (error) {
    await deps.persist({
      ...attempt,
      status: "queued",
      lastError:
        error instanceof Error
          ? error.message
          : "No se pudo contactar con la API.",
      updatedAt: Date.now(),
    })

    return {
      outcome: "offline",
      reconciled,
      orderId,
      message: "No se pudo contactar con la API.",
    }
  }
}

async function fail(
  operation: QueuedRound,
  result: ActionResult<unknown>,
  deps: SyncDeps,
  orderId: string | null,
  reconciled: boolean,
): Promise<SyncResult> {
  if (result.network) {
    await deps.persist({
      ...operation,
      status: "queued",
      lastError: result.message,
      updatedAt: Date.now(),
    })

    return {
      outcome: "offline",
      reconciled,
      orderId,
      message: result.message,
    }
  }

  const message = result.message ?? "La operación fue rechazada."

  await deps.persist({
    ...operation,
    status: "error",
    lastError: message,
    updatedAt: Date.now(),
  })

  return { outcome: "error", reconciled, orderId, message }
}
