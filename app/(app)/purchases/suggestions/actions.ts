"use server"

import { mutateApi, readApi, type ActionResult } from "@/lib/server-api"
import type {
  PriceAlert,
  SupplierComparison,
  SuggestionsResponse,
} from "@/lib/forecast"

export async function getSuggestions(
  coverDays = 7
): Promise<ActionResult<SuggestionsResponse>> {
  return readApi(`/intel/forecast/suggestions?coverDays=${coverDays}`)
}

export async function getPriceAlerts(): Promise<
  ActionResult<{ alerts: PriceAlert[] }>
> {
  return readApi("/intel/forecast/price-alerts")
}

export async function getComparison(
  ingredientId: string
): Promise<ActionResult<SupplierComparison>> {
  return readApi(
    `/intel/forecast/comparison?ingredientId=${encodeURIComponent(ingredientId)}`
  )
}

export interface SuggestionFeedbackInput {
  kind: "FORECAST" | "SUGGESTION"
  accepted: boolean
  payload?: Record<string, unknown>
  adjustments?: Record<string, unknown>
}

export async function saveSuggestionFeedback(
  input: SuggestionFeedbackInput
): Promise<ActionResult<unknown>> {
  return mutateApi("/intel/forecast/feedback", "POST", input, [
    "/purchases/suggestions",
  ])
}
