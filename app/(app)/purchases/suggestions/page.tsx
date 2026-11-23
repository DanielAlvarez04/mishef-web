import { SuggestionsView } from "@/components/purchases/suggestions-view"
import { apiFetch } from "@/lib/api"
import type { Ingredient } from "@/lib/catalog"
import type { PriceAlert, SuggestionsResponse } from "@/lib/forecast"
import { requireAnyRole } from "@/lib/session"

export default async function PurchaseSuggestionsPage() {
  await requireAnyRole(["ADMIN", "SUPERVISOR", "INVENTORY_MANAGER"])

  const [suggestionsResponse, alertsResponse, ingredientsResponse] =
    await Promise.all([
      apiFetch("/intel/forecast/suggestions?coverDays=7"),
      apiFetch("/intel/forecast/price-alerts"),
      apiFetch("/inventory/ingredients"),
    ])

  const suggestions = suggestionsResponse.ok
    ? ((await suggestionsResponse.json()) as SuggestionsResponse)
    : null
  const alerts = alertsResponse.ok
    ? ((await alertsResponse.json()) as { alerts: PriceAlert[] }).alerts
    : []
  const ingredients = ingredientsResponse.ok
    ? ((await ingredientsResponse.json()) as Ingredient[])
    : []

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <SuggestionsView
        suggestions={suggestions}
        alerts={alerts}
        ingredients={ingredients.filter((ingredient) => ingredient.isActive)}
      />
    </div>
  )
}
