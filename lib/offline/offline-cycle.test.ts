import type { QueuedRound } from "./types"
import { syncQueuedRound } from "./sync-round"
import { POS_CACHE_SCOPES, tenantCacheKey } from "./cache-keys"

/**
 * Ciclo offline completo, sin navegador:
 * encolar → red caída → reconexión → sincronizar una sola vez.
 */

function buildRound(overrides: Partial<QueuedRound> = {}): QueuedRound {
  return {
    id: "op-1",
    userId: "user-1",
    kind: "round",
    status: "queued",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    attempts: 0,
    label: "Mesa 4 · 2 línea(s)",
    total: 120,
    order: {
      tableNumber: "4",
      isTakeaway: false,
      idempotencyKey: "order-key-1",
    },
    round: {
      idempotencyKey: "round-key-1",
      items: [{ itemId: "item-1", quantity: 2 }],
    },
    ...overrides,
  }
}

/** Mismo bucle que usa el proveedor: en orden y deteniéndose si no hay red. */
async function flush(
  store: Map<string, QueuedRound>,
  deps: Parameters<typeof syncQueuedRound>[1],
) {
  const pending = [...store.values()]
    .filter((operation) => operation.status !== "error")
    .sort((a, b) => a.createdAt - b.createdAt)

  for (const operation of pending) {
    const result = await syncQueuedRound(operation, deps)

    if (result.outcome === "offline") return
  }
}

describe("ciclo offline completo", () => {
  it("encola, sobrevive a la caída y sincroniza una sola vez al reconectar", async () => {
    const store = new Map<string, QueuedRound>()
    store.set("op-1", buildRound())

    const createOrder = jest.fn()
    const sendRound = jest.fn()
    const persist = jest.fn(async (operation: QueuedRound) => {
      store.set(operation.id, operation)
    })
    const remove = jest.fn(async (id: string) => {
      store.delete(id)
    })

    const deps = { createOrder, sendRound, persist, remove }

    // 1. Red caída: la API no responde.
    createOrder.mockRejectedValueOnce(new Error("Failed to fetch"))
    await flush(store, deps)

    expect(createOrder).toHaveBeenCalledTimes(1)
    expect(sendRound).not.toHaveBeenCalled()
    expect(store.get("op-1")?.status).toBe("queued")
    expect(store.size).toBe(1)

    // 2. Vuelve la red y otro dispositivo ya abrió la mesa: se reconcilia.
    createOrder.mockResolvedValueOnce({
      ok: true,
      data: { id: "open-1", reconciled: true },
    })
    sendRound.mockResolvedValueOnce({ ok: true })

    await flush(store, deps)

    // La misma clave de idempotencia, un solo intento efectivo de creación.
    expect(createOrder).toHaveBeenCalledTimes(2)
    expect(createOrder.mock.calls[0][0].idempotencyKey).toBe(
      createOrder.mock.calls[1][0].idempotencyKey,
    )
    expect(createOrder.mock.calls[0][0].idempotencyKey).toBe("order-key-1")
    expect(createOrder).toHaveBeenLastCalledWith({
      tableNumber: "4",
      isTakeaway: false,
      idempotencyKey: "order-key-1",
      reuseOpenTable: true,
    })

    // La ronda va a la cuenta reconciliada, con su propia clave.
    expect(sendRound).toHaveBeenCalledTimes(1)
    expect(sendRound).toHaveBeenCalledWith("open-1", {
      items: [{ itemId: "item-1", quantity: 2 }],
      idempotencyKey: "round-key-1",
    })

    // 3. La cola queda vacía y un nuevo flush no reenvía nada.
    expect(store.size).toBe(0)

    await flush(store, deps)
    expect(createOrder).toHaveBeenCalledTimes(2)
    expect(sendRound).toHaveBeenCalledTimes(1)
  })

  it("no duplica la ronda si se reintenta después de enviarla", async () => {
    const store = new Map<string, QueuedRound>()
    store.set("op-1", buildRound({ orderId: "open-9" }))

    const createOrder = jest.fn()
    const sendRound = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, network: true, message: "sin red" })
      .mockResolvedValueOnce({ ok: true })
    const persist = jest.fn(async (operation: QueuedRound) => {
      store.set(operation.id, operation)
    })
    const remove = jest.fn(async (id: string) => {
      store.delete(id)
    })

    const deps = { createOrder, sendRound, persist, remove }

    await flush(store, deps)
    expect(store.size).toBe(1)
    expect(sendRound).toHaveBeenCalledTimes(1)

    await flush(store, deps)

    // La segunda vez reutiliza el mismo orderId y la misma clave de ronda.
    expect(createOrder).not.toHaveBeenCalled()
    expect(sendRound).toHaveBeenLastCalledWith("open-9", {
      items: [{ itemId: "item-1", quantity: 2 }],
      idempotencyKey: "round-key-1",
    })
    expect(store.size).toBe(0)
  })

  it("usa claves de caché aisladas por negocio y sucursal", () => {
    const a = tenantCacheKey(POS_CACHE_SCOPES.items, "orgA", "branch1")
    const b = tenantCacheKey(POS_CACHE_SCOPES.items, "orgB", "branch1")

    expect(a).not.toBe(b)
  })
})
