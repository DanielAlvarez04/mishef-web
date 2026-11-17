export interface BenchmarkMetric {
  key: string
  label: string
  betterWhen: "higher" | "lower"
  value: number
  percentile: number
  p25: number
  p50: number
  p75: number
  p90: number
}

export interface BenchmarkReport {
  available: boolean
  reason: "no_organization" | "insufficient_cohort" | null
  period: { from: string; to: string; days: number }
  cohort: {
    businessType: string | null
    organizations: number
    minimum: number
    scope: "local" | "national"
    radiusKm: number | null
    localCandidates: number
    myLocation: { latitude: number; longitude: number } | null
  } | null
  metrics: BenchmarkMetric[]
}

/** Formato según la métrica: ticket en dinero, food cost en %, rotación en cuentas. */
export function formatMetric(key: string, value: number): string {
  if (key === "foodCostPct") return `${(value * 100).toFixed(1)} %`
  if (key === "rotation") return value.toFixed(2)
  return `$${value.toFixed(2)}`
}
