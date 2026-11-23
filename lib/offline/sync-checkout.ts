import type { ActionResult } from "@/lib/server-api"
import type { Order } from "@/lib/orders"
import type { CreateOrderInput, SendRoundInput } from "@/lib/order-actions"
import type {
  RegisterOfflineCardInput,
  RegisterPaymentInput,
} from "@/lib/payment-actions"
import type { QueuedCheckout } from "./types"
import type { SyncResult } from "./sync-round"

export interface CheckoutDeps {
  createOrder: (input: CreateOrderInput) => Promise<ActionResult<Order>>
  sendRound: (
    orderId: string,
    input: SendRoundInput,
  ) => Promise<ActionResult<unknown>>
  registerPayment: (
    orderId: string,
    input: RegisterPaymentInput,
  ) => Promise<ActionResult<unknown>>
  registerOfflineCard: (
    orderId: string,
    input: RegisterOfflineCardInput,
  ) => Promise<ActionResult<unknown>>
  closeOrder: (orderId: string) => Promise<ActionResult<Order>>
  persist: (operation: QueuedCheckout) => Promise<void>
  remove: (id: string) => Promise<void>
}

function isAlreadyClosed(message?: string): boolean {
  const text = message?.toLowerCase() ?? ""

  return (
    text.includes("ya no está abierta") ||
    text.includes("ya no esta abierta") ||
    text.includes("ya cambió de estado") ||
    text.includes("ya cambio de estado")
  )
}

/**
 * Sincroniza una venta cobrada en efectivo sin conexión.
 *
 * Orden estricto: cuenta → ronda (si venía incluida) → pago confirmado →
 * cierre. Si el pago ya se había aplicado, su clave de idempotencia devuelve
 * el mismo registro; si la cuenta ya se cerró, el cierre se considera hecho.
 */
export async function syncQueuedCheckout(
  operation: QueuedCheckout,
  deps: CheckoutDeps,
): Promise<SyncResult> {
  const attempt: QueuedCheckout = {
    ...operation,
    status: "syncing",
    attempts: operation.attempts + 1,
    updatedAt: Date.now(),
  }

  await deps.persist(attempt)

  let orderId = attempt.orderId ?? null
  let reconciled = false

  try {
    if (!orderId) {
      if (!attempt.order || !attempt.round) {
        return fail(
          attempt,
          {
            ok: false,
            message: "La venta no tiene una cuenta identificada.",
          },
          deps,
          null,
          false,
        )
      }

      const created = await deps.createOrder({
        ...attempt.order,
        reuseOpenTable: true,
      })

      if (!created.ok || !created.data) {
        return fail(attempt, created, deps, null, false)
      }

      reconciled = created.data.reconciled === true
      orderId = created.data.id
      await deps.persist({ ...attempt, orderId })

      const sent = await deps.sendRound(orderId, {
        items: attempt.round.items,
        idempotencyKey: attempt.round.idempotencyKey,
      })

      if (!sent.ok) {
        return fail(attempt, sent, deps, orderId, reconciled)
      }
    }

    if (attempt.payment.method === "CARD") {
      const registered = await deps.registerOfflineCard(orderId, {
        amount: attempt.payment.amount,
        tipAmount: attempt.payment.tipAmount,
        tipPercent: attempt.payment.tipPercent ?? null,
        tipSource: attempt.payment.tipSource,
        tipBaseAmount: attempt.payment.tipBaseAmount ?? null,
        reference: attempt.payment.reference?.trim() ?? "",
        deviceId: attempt.payment.deviceId ?? "",
        createdOfflineAt: attempt.payment.createdOfflineAt
          ? new Date(attempt.payment.createdOfflineAt).toISOString()
          : undefined,
        idempotencyKey: attempt.payment.idempotencyKey,
      });

      if (!registered.ok) {
        return fail(attempt, registered, deps, orderId, reconciled);
      }

      await deps.remove(attempt.id);

      return {
        outcome: "done",
        reconciled,
        orderId,
        pendingReview: true,
      };
    }

    const paid = await deps.registerPayment(orderId, {
      method: "CASH",
      amount: attempt.payment.amount,
      tipAmount: attempt.payment.tipAmount,
      tipPercent: attempt.payment.tipPercent ?? null,
      tipSource: attempt.payment.tipSource,
      tipBaseAmount: attempt.payment.tipBaseAmount ?? null,
      cashReceived: attempt.payment.cashReceived,
      changeGiven: attempt.payment.changeGiven,
      confirm: true,
      idempotencyKey: attempt.payment.idempotencyKey,
    })

    if (!paid.ok) {
      return fail(attempt, paid, deps, orderId, reconciled)
    }

    if (attempt.closeOrder) {
      const closed = await deps.closeOrder(orderId)

      if (!closed.ok) {
        // Reintento después de que el servidor cerró pero se perdió la
        // respuesta: no es un error, la cuenta ya está como debe.
        if (isAlreadyClosed(closed.message)) {
          await deps.remove(attempt.id)
          return { outcome: "done", reconciled, orderId }
        }

        return fail(attempt, closed, deps, orderId, reconciled)
      }
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
  operation: QueuedCheckout,
  result: ActionResult<unknown>,
  deps: CheckoutDeps,
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

  const message = result.message ?? "La venta fue rechazada."

  await deps.persist({
    ...operation,
    status: "error",
    lastError: message,
    updatedAt: Date.now(),
  })

  return { outcome: "error", reconciled, orderId, message }
}
