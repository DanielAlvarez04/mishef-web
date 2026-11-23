import type { ActionResult } from "@/lib/server-api"
import type { QueuedTicket } from "./types"
import type { SyncResult } from "./sync-round"

/**
 * Sincronización de una foto de ticket guardada sin conexión.
 *
 * La foto vive como `Blob` en IndexedDB. Al recuperar la conexión se firma una
 * subida nueva, se manda a R2 y se crea la compra. La extracción con visión es
 * best-effort: si falla, la compra queda en revisión para capturarla a mano.
 */
export interface SyncTicketDeps {
  presignTicket: (
    contentType: string,
    size: number,
  ) => Promise<ActionResult<{ key: string; uploadUrl: string }>>
  createTicket: (input: {
    documentKey: string
    documentMime?: string
  }) => Promise<ActionResult<{ id: string }>>
  extractTicket: (id: string) => Promise<ActionResult<unknown>>
  persist: (operation: QueuedTicket) => Promise<void>
  remove: (id: string) => Promise<void>
}

export async function syncQueuedTicket(
  operation: QueuedTicket,
  deps: SyncTicketDeps,
): Promise<SyncResult> {
  const attempt: QueuedTicket = {
    ...operation,
    status: "syncing",
    attempts: operation.attempts + 1,
    updatedAt: Date.now(),
  }

  await deps.persist(attempt)

  const presign = await deps.presignTicket(operation.mimeType, operation.size)

  if (!presign.ok || !presign.data) {
    if (presign.network) {
      await deps.persist({
        ...attempt,
        status: "queued",
        lastError: presign.message,
      })

      return {
        outcome: "offline",
        reconciled: false,
        orderId: null,
        message: presign.message,
      }
    }

    await deps.persist({
      ...attempt,
      status: "error",
      lastError: presign.message ?? "No se pudo firmar la subida del ticket",
    })

    return {
      outcome: "error",
      reconciled: false,
      orderId: null,
      message: presign.message,
    }
  }

  const upload = await fetch(presign.data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": operation.mimeType },
    body: operation.file,
  }).catch(() => null)

  if (!upload?.ok) {
    await deps.persist({
      ...attempt,
      status: "queued",
      lastError: "No se pudo subir la foto; se reintentará",
    })

    return {
      outcome: "offline",
      reconciled: false,
      orderId: null,
      message: "No se pudo subir la foto del ticket",
    }
  }

  const created = await deps.createTicket({
    documentKey: presign.data.key,
    documentMime: operation.mimeType,
  })

  if (!created.ok || !created.data) {
    const offline = created.network === true

    await deps.persist({
      ...attempt,
      status: offline ? "queued" : "error",
      lastError: created.message,
    })

    return {
      outcome: offline ? "offline" : "error",
      reconciled: false,
      orderId: null,
      message: created.message,
    }
  }

  // La compra ya existe. Si la visión falla, se puede reintentar o capturar a
  // mano desde la pantalla de revisión; no se pierde la foto.
  await deps.extractTicket(created.data.id).catch(() => null);
  await deps.remove(operation.id)

  return { outcome: "done", reconciled: false, orderId: null }
}
