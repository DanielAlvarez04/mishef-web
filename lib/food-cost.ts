export interface FoodCostRow {
  id: string
  name: string
  isCombo: boolean
  price: number
  netPrice: number
  cost: number
  foodCostPct: number
  margin: number
  marginPct: number
  hasRecipe: boolean
  missing: string[]
  complete: boolean
  aboveTarget: boolean
}

export interface FoodCostSummary {
  items: number
  withRecipe: number
  withoutRecipe: number
  incomplete: number
  aboveTarget: number
  averageFoodCostPct: number | null
}

export interface FoodCostReport {
  target: number
  items: FoodCostRow[]
  summary: FoodCostSummary | null
}

/** Porcentaje legible: 0.1345 → "13.5 %". */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—"
  }
  return `${(value * 100).toFixed(1)} %`
}
