import { AnomaliesView } from "@/components/intel/anomalies-view"
import { apiFetch } from "@/lib/api"
import type { AnomalyResponse } from "@/lib/anomalies"
import { requireAnyRole } from "@/lib/session"

export default async function AnomaliesPage() {
  await requireAnyRole([
    "ADMIN",
    "CASHIER",
    "SUPERVISOR",
    "INVENTORY_MANAGER",
  ])

  const response = await apiFetch("/intel/anomalies")
  const data = response.ok
    ? ((await response.json()) as AnomalyResponse)
    : null

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <AnomaliesView data={data} />
    </div>
  )
}
