import {
  appendComandaRound,
  comandaDetailKey,
  mergeComandaRounds,
} from "./pos-comanda"
import type {
  ComandaItem,
  ComandaRound,
  OrderSummaryRound,
} from "./orders"

function item(id: string): ComandaItem {
  return {
    id,
    itemId: "item-1",
    itemVariantId: null,
    itemName: "Latte",
    variantName: null,
    quantity: 1,
    subtotal: "50.00",
    notes: null,
    guestId: null,
    guestName: null,
    extras: [],
    options: [],
    exclusions: [],
  }
}

function summaryRound(
  status: OrderSummaryRound["status"],
  items = 1,
  sentAt = "2026-01-01T10:00:00.000Z"
): OrderSummaryRound {
  return {
    id: "round-1",
    status,
    sentAt,
    createdAt: sentAt,
    _count: { items },
  }
}

function detailRound(
  status: ComandaRound["status"],
  items: ComandaItem[] = [item("line-1")],
  sentAt = "2026-01-01T09:00:00.000Z"
): ComandaRound {
  return {
    id: "round-1",
    status,
    sentAt,
    createdAt: sentAt,
    items,
  }
}

describe("comandaDetailKey", () => {
  it("no cambia cuando cambia el estado de una ronda", () => {
    expect(comandaDetailKey("o1", [summaryRound("PENDING")])).toBe(
      comandaDetailKey("o1", [summaryRound("READY")])
    )
  })

  it("cambia cuando aparece una ronda o cambia su número de líneas", () => {
    const base = comandaDetailKey("o1", [summaryRound("READY", 1)])

    expect(comandaDetailKey("o1", [summaryRound("READY", 2)])).not.toBe(base)
    expect(
      comandaDetailKey("o1", [
        summaryRound("READY", 1),
        { ...summaryRound("PENDING", 2), id: "round-2" },
      ])
    ).not.toBe(base)
  })

  it("ignora rondas canceladas y devuelve null sin rondas activas", () => {
    expect(comandaDetailKey("o1", [summaryRound("CANCELLED")])).toBeNull()
  })
})

describe("mergeComandaRounds", () => {
  it("usa estados frescos del resumen y artículos del detalle", () => {
    const [merged] = mergeComandaRounds(
      [summaryRound("READY", 1, "2026-01-01T11:00:00.000Z")],
      [detailRound("PREPARING")]
    )

    expect(merged.status).toBe("READY")
    expect(merged.sentAt).toBe("2026-01-01T11:00:00.000Z")
    expect(merged.items).toHaveLength(1)
    expect(merged.items[0].id).toBe("line-1")
  })

  it("conserva una ronda recién enviada que aún no está en el resumen", () => {
    const seeded: ComandaRound = {
      id: "round-seeded",
      status: "PENDING",
      sentAt: "2026-01-01T12:00:00.000Z",
      createdAt: "2026-01-01T12:00:00.000Z",
      items: [item("line-seeded")],
    }

    const merged = mergeComandaRounds(
      [summaryRound("READY")],
      [detailRound("READY"), seeded]
    )

    expect(merged.map((round) => round.id)).toEqual(["round-1", "round-seeded"])
    expect(merged[1].items[0].id).toBe("line-seeded")
  })

  it("no muestra rondas canceladas", () => {
    const merged = mergeComandaRounds(
      [summaryRound("CANCELLED")],
      [detailRound("CANCELLED")]
    )

    expect(merged).toHaveLength(0)
  })
})

describe("appendComandaRound", () => {
  it("crea el detalle para una cuenta nueva", () => {
    const round = detailRound("PENDING")

    expect(appendComandaRound(null, "o1", round)).toEqual({
      id: "o1",
      total: "0",
      rounds: [round],
    })
  })

  it("añade una ronda una sola vez", () => {
    const round = detailRound("PENDING")
    const first = appendComandaRound(null, "o1", round)
    const second = appendComandaRound(first, "o1", round)

    expect(second.rounds).toHaveLength(1)
  })
})
