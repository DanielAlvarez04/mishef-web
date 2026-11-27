import type {
  ComandaDetail,
  ComandaRound,
  OrderRound,
  OrderSummaryRound,
} from "./orders"

/**
 * Firma estable para cachear los artículos de la comanda.
 *
 * No incluye estados de ronda: cocina puede avanzar sin invalidar los
 * artículos ya cargados. Solo cambia cuando aparece una ronda o cambia su
 * número de líneas.
 */
export function comandaDetailKey(
  orderId: string,
  rounds: Array<OrderRound | OrderSummaryRound>
): string | null {
  const activeRounds = rounds.filter((round) => round.status !== "CANCELLED")

  if (activeRounds.length === 0) return null

  return `${orderId}:${activeRounds
    .map((round) => {
      const itemCount =
        "items" in round ? round.items.length : round._count?.items ?? 0
      return `${round.id}:${itemCount}`
    })
    .join(",")}`
}

/**
 * Mezcla las rondas resumidas (frescas) con los artículos del detalle.
 *
 * Los estados y timestamps siempre salen del resumen; los artículos del
 * detalle cacheado. Las rondas nuevas que aún no aparecen en el resumen
 * (recién enviadas) se conservan para pintarlas de inmediato.
 */
export function mergeComandaRounds(
  summaryRounds: Array<OrderRound | OrderSummaryRound>,
  detailRounds: ComandaRound[] | null | undefined
): ComandaRound[] {
  const detailById = new Map(
    (detailRounds ?? []).map((round) => [round.id, round])
  )
  const merged: ComandaRound[] = summaryRounds.map((round) => {
    const detailRound = detailById.get(round.id)

    return {
      id: round.id,
      status: round.status,
      sentAt: round.sentAt,
      createdAt: round.createdAt,
      items: detailRound?.items ?? ("items" in round ? round.items : []),
    }
  })
  const summaryIds = new Set(summaryRounds.map((round) => round.id))

  for (const round of detailRounds ?? []) {
    if (!summaryIds.has(round.id)) merged.push(round)
  }

  return merged.filter((round) => round.status !== "CANCELLED")
}

/** Une el detalle cacheado con una ronda recién devuelta por `sendRound`. */
export function appendComandaRound(
  detail: ComandaDetail | null,
  orderId: string,
  round: ComandaRound
): ComandaDetail {
  if (!detail || detail.id !== orderId) {
    return { id: orderId, total: "0", rounds: [round] }
  }

  if (detail.rounds.some((entry) => entry.id === round.id)) return detail

  return { ...detail, rounds: [...detail.rounds, round] }
}
