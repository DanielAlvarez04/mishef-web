/**
 * Medición ligera del POS.
 *
 * Solo imprime en desarrollo o con `NEXT_PUBLIC_POS_PERF=1`. Sirve para
 * comparar el coste de las acciones optimistas y de los refrescos dirigidos
 * sin añadir ruido en producción.
 */
const POS_PERF_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_POS_PERF === "1"

export function startPosPerf(label: string) {
  if (!POS_PERF_ENABLED || typeof performance === "undefined") {
    return () => {}
  }

  const startedAt = performance.now()

  return (detail?: Record<string, unknown>) => {
    const ms = Math.round((performance.now() - startedAt) * 10) / 10

    console.info(`[pos-perf] ${label}: ${ms}ms`, detail ?? "")
  }
}
