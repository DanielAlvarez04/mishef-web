import type { QueuedCashClose, QueuedCheckout } from "./types";
import { syncQueuedCheckout } from "./sync-checkout";
import { syncQueuedCashClose } from "./sync-cash-close";

function checkout(overrides: Partial<QueuedCheckout> = {}): QueuedCheckout {
  return {
    id: "c1",
    userId: "u1",
    kind: "checkout",
    status: "queued",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    attempts: 0,
    label: "Mesa 4 · efectivo",
    total: 116,
    orderId: "o1",
    payment: {
      amount: 100,
      tipAmount: 16,
      tipSource: "CUSTOM",
      cashReceived: 120,
      changeGiven: 4,
      idempotencyKey: "pay-1",
    },
    closeOrder: true,
    ...overrides,
  };
}

function cashClose(overrides: Partial<QueuedCashClose> = {}): QueuedCashClose {
  return {
    id: "x1",
    userId: "u1",
    kind: "cash_close",
    status: "queued",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    attempts: 0,
    label: "Cierre de caja",
    total: 1500,
    sessionId: "s1",
    countedCash: 1500,
    idempotencyKey: "close-1",
    ...overrides,
  };
}

function deps() {
  return {
    createOrder: jest.fn(),
    sendRound: jest.fn(),
    registerPayment: jest.fn(),
    closeOrder: jest.fn(),
    persist: jest.fn(async () => {}),
    remove: jest.fn(async () => {}),
  };
}

describe("offline checkout", () => {
  it("cobra y cierra una cuenta existente con idempotencia", async () => {
    const d = deps();
    d.registerPayment.mockResolvedValue({ ok: true, data: { id: "p1" } });
    d.closeOrder.mockResolvedValue({ ok: true, data: { id: "o1" } });

    const result = await syncQueuedCheckout(checkout(), d);

    expect(result.outcome).toBe("done");
    expect(d.createOrder).not.toHaveBeenCalled();
    expect(d.registerPayment).toHaveBeenCalledWith(
      "o1",
      expect.objectContaining({
        method: "CASH",
        amount: 100,
        tipAmount: 16,
        confirm: true,
        idempotencyKey: "pay-1",
      }),
    );
    expect(d.closeOrder).toHaveBeenCalledWith("o1");
    expect(d.remove).toHaveBeenCalledWith("c1");
  });

  it("crea la cuenta y envía la ronda cuando la venta nació offline", async () => {
    const d = deps();
    d.createOrder.mockResolvedValue({ ok: true, data: { id: "o2" } });
    d.sendRound.mockResolvedValue({ ok: true });
    d.registerPayment.mockResolvedValue({ ok: true, data: { id: "p2" } });
    d.closeOrder.mockResolvedValue({ ok: true, data: { id: "o2" } });

    const operation = checkout({
      orderId: undefined,
      order: { tableNumber: "4", isTakeaway: false, idempotencyKey: "ord-1" },
      round: {
        items: [{ itemId: "i1", quantity: 1 }],
        idempotencyKey: "round-1",
      },
    });

    const result = await syncQueuedCheckout(operation, d);

    expect(result.outcome).toBe("done");
    expect(d.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "ord-1", reuseOpenTable: true }),
    );
    expect(d.sendRound).toHaveBeenCalledWith("o2", {
      items: [{ itemId: "i1", quantity: 1 }],
      idempotencyKey: "round-1",
    });
    expect(d.registerPayment).toHaveBeenCalledWith(
      "o2",
      expect.objectContaining({ idempotencyKey: "pay-1" }),
    );
  });

  it("deja la venta en cola si se cae la red y no la duplica al reintentar", async () => {
    const d = deps();
    d.registerPayment
      .mockResolvedValueOnce({ ok: false, network: true, message: "sin red" })
      .mockResolvedValueOnce({ ok: true, data: { id: "p1" } });
    d.closeOrder.mockResolvedValue({ ok: true, data: { id: "o1" } });

    const first = await syncQueuedCheckout(checkout(), d);
    expect(first.outcome).toBe("offline");
    expect(d.remove).not.toHaveBeenCalled();

    const second = await syncQueuedCheckout(checkout(), d);
    expect(second.outcome).toBe("done");
    expect(d.registerPayment).toHaveBeenNthCalledWith(
      2,
      "o1",
      expect.objectContaining({ idempotencyKey: "pay-1" }),
    );
  });

  it("considera hecho el cierre si la cuenta ya estaba cerrada", async () => {
    const d = deps();
    d.registerPayment.mockResolvedValue({ ok: true, data: { id: "p1" } });
    d.closeOrder.mockResolvedValue({
      ok: false,
      message: "La cuenta ya no está abierta",
    });

    const result = await syncQueuedCheckout(checkout(), d);

    expect(result.outcome).toBe("done");
    expect(d.remove).toHaveBeenCalledWith("c1");
  });
});

describe("offline cash close", () => {
  it("cierra la caja con la clave de idempotencia y la quita de la cola", async () => {
    const d = {
      closeCashSession: jest.fn().mockResolvedValue({ ok: true, data: {} }),
      persist: jest.fn(async () => {}),
      remove: jest.fn(async () => {}),
    };

    const result = await syncQueuedCashClose(cashClose(), d);

    expect(result.outcome).toBe("done");
    expect(d.closeCashSession).toHaveBeenCalledWith("s1", {
      countedCash: 1500,
      notes: undefined,
      idempotencyKey: "close-1",
    });
    expect(d.remove).toHaveBeenCalledWith("x1");
  });

  it("marca error si un cierre ajeno ya cerró la caja", async () => {
    const d = {
      closeCashSession: jest.fn().mockResolvedValue({
        ok: false,
        message: "La caja ya está cerrada",
      }),
      persist: jest.fn(async () => {}),
      remove: jest.fn(async () => {}),
    };

    const result = await syncQueuedCashClose(cashClose(), d);

    expect(result.outcome).toBe("error");
    expect(d.remove).not.toHaveBeenCalled();
  });

  it("mantiene el cierre en cola si se cae la red", async () => {
    const d = {
      closeCashSession: jest.fn().mockResolvedValue({
        ok: false,
        network: true,
        message: "sin red",
      }),
      persist: jest.fn(async () => {}),
      remove: jest.fn(async () => {}),
    };

    const result = await syncQueuedCashClose(cashClose(), d);

    expect(result.outcome).toBe("offline");
    expect(d.persist).toHaveBeenCalledWith(
      expect.objectContaining({ status: "queued" }),
    );
    expect(d.remove).not.toHaveBeenCalled();
  });
});
