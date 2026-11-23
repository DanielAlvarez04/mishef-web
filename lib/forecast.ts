import type { UnitCode } from "@/lib/catalog"

export type ForecastRisk = "HIGH" | "MEDIUM" | "LOW"

export interface ForecastRow {
  ingredientId: string
  name: string
  displayUnit: UnitCode
  currentStock: number
  minStock: number
  dailyAverage: number
  trend: number
  weekdayFactors: number[]
  leadTimeDays: number
  daysOfCover: number | null
  projectedAtLeadTime: number
  suggestedQuantity: number
  risk: ForecastRisk
  explanation: string
  unitCost: number | null
  estimatedCost: number
  lastSupplier: { id: string; name: string } | null
}

export interface SuggestionsResponse {
  generatedAt: string
  coverDays: number
  items: ForecastRow[]
  totalEstimatedCost: number
}

export interface PriceAlert {
  ingredientId: string
  ingredientName: string
  supplierId: string
  supplierName: string
  previousCost: number
  lastCost: number
  changePercent: number
  displayUnit: UnitCode
  lastPurchasedAt: string
}

export interface SupplierComparisonRow {
  supplierId: string
  supplierName: string
  lastCost: number
  averageCost: number
  minCost: number
  purchases: number
  lastPurchasedAt: string
}

export interface SupplierComparison {
  ingredient: { id: string; name: string; displayUnit: UnitCode }
  rows: SupplierComparisonRow[]
  best: SupplierComparisonRow | null
}

export interface CatalogProposalFields {
  description?: string
  allergens?: string[]
  categoryName?: string
  translations?: {
    en?: { name?: string; description?: string }
  }
  marketingCopy?: string
}

export type CatalogAiField =
  | "description"
  | "allergens"
  | "category"
  | "translations"
  | "marketingCopy"

export interface CatalogProposal {
  id: string
  itemId: string
  fields: CatalogProposalFields
  status: string
  model: string | null
  createdAt: string
  item: {
    id: string
    name: string
    description?: string | null
    allergens?: string[]
    category?: { id: string; name: string } | null
  }
}

export const CATALOG_AI_FIELD_LABELS: Record<CatalogAiField, string> = {
  description: "Descripción",
  allergens: "Alérgenos",
  category: "Categoría",
  translations: "Traducción al inglés",
  marketingCopy: "Copy para carta",
}

export function riskLabel(risk: ForecastRisk): string {
  switch (risk) {
    case "HIGH":
      return "Urgente"
    case "MEDIUM":
      return "Pronto"
    default:
      return "Cubierto"
  }
}

export function riskVariant(
  risk: ForecastRisk
): "destructive" | "secondary" | "success" {
  if (risk === "HIGH") return "destructive"
  if (risk === "MEDIUM") return "secondary"
  return "success"
}
