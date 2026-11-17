import type { ActionResult } from "@/lib/server-api"
import type { CashSessionPayload } from "@/lib/cash"
import type { QueuedCashClose } from "./types"
import type { SyncResult } from "./sync-round"

export interface CashCloseDeps {
  closeCashSession: (
    sessionId: string,
    input: { countedCash: number; notes?: string; idempotencyKey?: string },
  ) => Promise<ActionResult<CashSessionPayload>>
  persist: (operation: QueuedCashClose) => Promise<void>
  remove: (id: string) => Promise<void>
}

/** Sincroniza el cierre de caja guardado en el dispositivo. */
export async function syncQueuedCashClose(
  operation: QueuedCashClose,
  deps: CashCloseDeps,
): Promise<SyncResult> {
  const attempt: QueuedCashClose = {
    ...operation,
    status: "syncing",
    attempts: operation.attempts + 1,
    updatedAt: Date.now(),
  }

  await deps.persist(attempt)

  try {
    const result = await deps.closeCashSession(attempt.sessionId, {
      countedCash: attempt.countedCash,
      notes: attempt.notes,
      idempotencyKey: attempt.idempotencyKey,
    })

    if (result.ok) {
      await deps.remove(attempt.id)
      return { outcome: "done", reconciled: false, orderId: null }
    }

    if (result.network) {
      await deps.persist({
        ...attempt,
        status: "queued",
        lastError: result.message,
        updatedAt: Date.now(),
      })

      return {
        outcome: "offline",
        reconciled: false,
        orderId: null,
        message: result.message,
      }
    }

    const message = result.message ?? "El cierre de caja fue rechazado."

    await deps.persist({
      ...attempt,
      status: "error",
      lastError: message,
      updatedAt: Date.now(),
    })

    return {
      outcome: "error",
      reconciled: false,
      orderId: null,
      message,
    }
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
      reconciled: false,
      orderId: null,
      message: "No se pudo contactar con la API.",
    }
  }
}
