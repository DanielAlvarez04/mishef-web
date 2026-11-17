"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { useMoney } from "@/lib/currency"
import {
  deleteQueuedOperation,
  listQueuedOperations,
  putQueuedOperation,
} from "@/lib/offline/db"
import type {
  QueuedCashClose,
  QueuedCheckout,
  QueuedOperation,
  QueuedRound,
  QueuedRoundItem,
} from "@/lib/offline/types"
import { syncQueuedCashClose } from "@/lib/offline/sync-cash-close"
import { syncQueuedCheckout } from "@/lib/offline/sync-checkout"
import { syncQueuedRound } from "@/lib/offline/sync-round"
import { closeCashSession } from "@/lib/cash-actions"
import { createOrder, sendRound } from "@/lib/order-actions"
import { closeOrder, registerPayment } from "@/lib/payment-actions"

import type { TipSource } from "@/lib/orders"

export interface EnqueueRoundInput {
  /** Cuenta ya abierta en el servidor (si se conocía al encolar). */
  orderId?: string
  tableNumber?: string
  isTakeaway: boolean
  items: QueuedRoundItem[]
  /** Total estimado en el dispositivo; el servidor recalcula el definitivo. */
  total: number
  label: string
  /**
   * Claves ya usadas en un intento online que falló por red. Reutilizarlas
   * evita duplicar la cuenta o la ronda si el servidor sí llegó a procesarlas.
   */
  orderIdempotencyKey?: string
  roundIdempotencyKey?: string
}

export interface EnqueueCheckoutInput {
  /** Cuenta existente; si falta, se crea con `order` + `round`. */
  orderId?: string
  order?: {
    tableNumber?: string
    isTakeaway: boolean
    idempotencyKey?: string
  }
  round?: {
    items: QueuedRoundItem[]
    idempotencyKey?: string
  }
  amount: number
  tipAmount?: number
  tipPercent?: number | null
  tipBaseAmount?: number | null
  tipSource?: TipSource
  cashReceived: number
  changeGiven?: number
  closeOrder?: boolean
  total: number
  label: string
}

export interface EnqueueCashCloseInput {
  sessionId: string
  countedCash: number
  notes?: string
  label?: string
}

interface OfflineSyncValue {
  isOnline: boolean
  operations: QueuedOperation[]
  syncing: boolean
  pendingCount: number
  errorCount: number
  enqueueRound: (input: EnqueueRoundInput) => Promise<QueuedRound>
  enqueueCheckout: (input: EnqueueCheckoutInput) => Promise<QueuedCheckout>
  enqueueCashClose: (input: EnqueueCashCloseInput) => Promise<QueuedCashClose>
  hasPendingCashClose: (sessionId: string) => boolean
  syncNow: () => Promise<void>
  retryOperation: (id: string) => Promise<void>
  discardOperation: (id: string) => Promise<void>
}

const OfflineSyncContext = React.createContext<OfflineSyncValue | null>(null)

export function useOfflineSync(): OfflineSyncValue {
  const value = React.useContext(OfflineSyncContext)

  if (!value) {
    throw new Error("useOfflineSync debe usarse dentro de <OfflineProvider>")
  }

  return value
}

function newKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/** Conectividad del navegador, sin setState dentro de un efecto. */
function subscribeToConnectivity(onChange: () => void) {
  window.addEventListener("online", onChange)
  window.addEventListener("offline", onChange)

  return () => {
    window.removeEventListener("online", onChange)
    window.removeEventListener("offline", onChange)
  }
}

const readOnline = () => navigator.onLine
// En el servidor y en la hidratación inicial se asume conexión: el primer
// valor real llega del navegador después de montar.
const readOnlineOnServer = () => true

type OperationOutcome = "done" | "offline" | "error"

export function OfflineProvider({
  userId,
  children,
}: {
  userId: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const money = useMoney()
  const isOnline = React.useSyncExternalStore(
    subscribeToConnectivity,
    readOnline,
    readOnlineOnServer
  )

  const [operations, setOperations] = React.useState<QueuedOperation[]>([])
  const [syncing, setSyncing] = React.useState(false)
  const syncingRef = React.useRef(false)

  const refresh = React.useCallback(async () => {
    const rows = await listQueuedOperations(userId)
    setOperations(rows.sort((a, b) => a.createdAt - b.createdAt))
  }, [userId])

  const persist = React.useCallback(
    async (operation: QueuedOperation) => {
      await putQueuedOperation(operation)
      await refresh()
    },
    [refresh]
  )

  const runOperation = React.useCallback(
    async (operation: QueuedOperation): Promise<OperationOutcome> => {
      let result: Awaited<ReturnType<typeof syncQueuedRound>>

      if (operation.kind === "round") {
        result = await syncQueuedRound(operation, {
          createOrder,
          sendRound,
          persist,
          remove: deleteQueuedOperation,
        })
      } else if (operation.kind === "checkout") {
        result = await syncQueuedCheckout(operation, {
          createOrder,
          sendRound,
          registerPayment,
          closeOrder,
          persist,
          remove: deleteQueuedOperation,
        })
      } else {
        result = await syncQueuedCashClose(operation, {
          closeCashSession,
          persist,
          remove: deleteQueuedOperation,
        })
      }

      if (result.outcome === "done") {
        if (result.reconciled) {
          toast.info("La cuenta ya estaba abierta en el servidor", {
            description: "La operación se unió a la cuenta existente.",
          })
        }

        await refresh()

        const noun =
          operation.kind === "round"
            ? "Ronda"
            : operation.kind === "checkout"
              ? "Venta"
              : "Cierre de caja"

        toast.success(`${noun} sincronizada · ${money(operation.total)}`, {
          description: operation.label,
        })

        // Cocina y saldos ya cambiaron en el servidor.
        router.refresh()
      } else if (result.outcome === "error") {
        toast.error("Una operación offline no se pudo sincronizar", {
          description: result.message,
        })
      }

      return result.outcome
    },
    [persist, refresh, router, money]
  )

  const flush = React.useCallback(async () => {
    if (syncingRef.current) return
    if (!navigator.onLine) return

    syncingRef.current = true
    setSyncing(true)

    try {
      const queue = await listQueuedOperations(userId)
      // El cierre de caja va al final y un error detiene la cola: no se debe
      // cerrar el turno si antes falló un cobro.
      const pending = queue
        .filter((operation) => operation.status !== "error")
        .sort((a, b) => {
          const rank = (operation: QueuedOperation) =>
            operation.kind === "cash_close" ? 1 : 0

          return rank(a) - rank(b) || a.createdAt - b.createdAt
        })

      for (const operation of pending) {
        const outcome = await runOperation(operation)
        if (outcome !== "done") break
      }
    } finally {
      syncingRef.current = false
      setSyncing(false)
      await refresh()
    }
  }, [refresh, runOperation, userId])

  // Carga inicial de la cola y registro del service worker.
  React.useEffect(() => {
    // Diferido para no actualizar estado durante el efecto de montaje.
    const initial = window.setTimeout(() => {
      void refresh()
    }, 0)

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then(async () => {
          // La primera visita puede ocurrir antes de que el SW controle la
          // página: se le pide explícitamente que guarde esta copia del POS.
          if (window.location.pathname !== "/pos") return;

          const registration = await navigator.serviceWorker.ready;
          registration.active?.postMessage({ type: "CACHE_POS" });
        })
        .catch(() => {
          // Sin service worker la app sigue funcionando; solo pierde el
          // arranque offline.
        })
    }

    return () => window.clearTimeout(initial)
  }, [refresh])

  // Al recuperar la conexión se sincroniza lo pendiente.
  React.useEffect(() => {
    if (!isOnline) return

    const timer = window.setTimeout(() => {
      void flush()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [flush, isOnline])

  // Reintento periódico mientras haya pendientes y conexión.
  React.useEffect(() => {
    if (!isOnline || operations.length === 0) return

    const timer = window.setInterval(() => {
      void flush()
    }, 20000)

    return () => window.clearInterval(timer)
  }, [flush, isOnline, operations.length])

  const enqueueRound = React.useCallback(
    async (input: EnqueueRoundInput): Promise<QueuedRound> => {
      const now = Date.now()
      const operation: QueuedRound = {
        id: newKey(),
        userId,
        kind: "round",
        status: "queued",
        createdAt: now,
        updatedAt: now,
        attempts: 0,
        label: input.label,
        total: input.total,
        orderId: input.orderId,
        order: {
          tableNumber: input.tableNumber?.trim() || undefined,
          isTakeaway: input.isTakeaway,
          idempotencyKey: input.orderIdempotencyKey ?? newKey(),
        },
        round: {
          items: input.items,
          idempotencyKey: input.roundIdempotencyKey ?? newKey(),
        },
      }

      await persist(operation)
      return operation
    },
    [persist, userId]
  )

  const enqueueCheckout = React.useCallback(
    async (input: EnqueueCheckoutInput): Promise<QueuedCheckout> => {
      const now = Date.now()
      const operation: QueuedCheckout = {
        id: newKey(),
        userId,
        kind: "checkout",
        status: "queued",
        createdAt: now,
        updatedAt: now,
        attempts: 0,
        label: input.label,
        total: input.total,
        orderId: input.orderId,
        order: input.order
          ? {
              tableNumber: input.order.tableNumber?.trim() || undefined,
              isTakeaway: input.order.isTakeaway,
              idempotencyKey: input.order.idempotencyKey ?? newKey(),
            }
          : undefined,
        round: input.round
          ? {
              items: input.round.items,
              idempotencyKey: input.round.idempotencyKey ?? newKey(),
            }
          : undefined,
        payment: {
          amount: input.amount,
          tipAmount: input.tipAmount ?? 0,
          tipPercent: input.tipPercent ?? null,
          tipBaseAmount: input.tipBaseAmount ?? null,
          tipSource: input.tipSource ?? "NONE",
          cashReceived: input.cashReceived,
          changeGiven: input.changeGiven,
          idempotencyKey: newKey(),
        },
        closeOrder: input.closeOrder ?? true,
      }

      await persist(operation)
      return operation
    },
    [persist, userId]
  )

  const enqueueCashClose = React.useCallback(
    async (input: EnqueueCashCloseInput): Promise<QueuedCashClose> => {
      const now = Date.now()
      const operation: QueuedCashClose = {
        id: newKey(),
        userId,
        kind: "cash_close",
        status: "queued",
        createdAt: now,
        updatedAt: now,
        attempts: 0,
        label: input.label ?? "Cierre de caja",
        total: input.countedCash,
        sessionId: input.sessionId,
        countedCash: input.countedCash,
        notes: input.notes,
        idempotencyKey: newKey(),
      }

      await persist(operation)
      return operation
    },
    [persist, userId]
  )

  const hasPendingCashClose = React.useCallback(
    (sessionId: string) =>
      operations.some(
        (operation) =>
          operation.kind === "cash_close" &&
          operation.sessionId === sessionId,
      ),
    [operations]
  )

  const retryOperation = React.useCallback(
    async (id: string) => {
      const queue = await listQueuedOperations(userId)
      const operation = queue.find((candidate) => candidate.id === id)
      if (!operation) return

      await persist({
        ...operation,
        status: "queued",
        lastError: undefined,
        updatedAt: Date.now(),
      })
      await flush()
    },
    [flush, persist, userId]
  )

  const discardOperation = React.useCallback(
    async (id: string) => {
      await deleteQueuedOperation(id)
      await refresh()
    },
    [refresh]
  )

  const pendingCount = operations.length
  const errorCount = operations.filter(
    (operation) => operation.status === "error"
  ).length

  const value = React.useMemo<OfflineSyncValue>(
    () => ({
      isOnline,
      operations,
      syncing,
      pendingCount,
      errorCount,
      enqueueRound,
      enqueueCheckout,
      enqueueCashClose,
      hasPendingCashClose,
      syncNow: flush,
      retryOperation,
      discardOperation,
    }),
    [
      discardOperation,
      enqueueCashClose,
      enqueueCheckout,
      enqueueRound,
      errorCount,
      flush,
      hasPendingCashClose,
      isOnline,
      operations,
      pendingCount,
      retryOperation,
      syncing,
    ]
  )

  return (
    <OfflineSyncContext.Provider value={value}>
      {children}
    </OfflineSyncContext.Provider>
  )
}
