export type AnomalyType = "DISCOUNT" | "CANCELLATION" | "CASH" | "WASTE"
export type AnomalySeverity = "HIGH" | "MEDIUM" | "LOW"

export interface AnomalyFinding {
  id: string
  type: AnomalyType
  severity: AnomalySeverity
  score: number
  title: string
  detail: string
  evidence: Record<string, unknown>
  link?: string
}

export interface AnomalySummary {
  total: number
  high: number
  medium: number
  low: number
  discounts: number
  cancelledOrders: number
  cashDifference: number
  waste: number
}

export interface AnomalyResponse {
  from: string
  to: string
  summary: AnomalySummary
  findings: AnomalyFinding[]
}

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  DISCOUNT: "Descuentos",
  CANCELLATION: "Cancelaciones",
  CASH: "Caja",
  WASTE: "Mermas",
}

export const ANOMALY_SEVERITY_LABELS: Record<AnomalySeverity, string> = {
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Baja",
}

export function anomalySeverityVariant(
  severity: AnomalySeverity
): "destructive" | "secondary" | "outline" {
  if (severity === "HIGH") return "destructive"
  if (severity === "MEDIUM") return "secondary"
  return "outline"
}

export function evidenceText(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (Array.isArray(value)) return value.map(evidenceText).join(", ")
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}
