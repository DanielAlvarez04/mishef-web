import { redirect } from "next/navigation"

import { PlansTable } from "@/components/billing/plans-table"
import { Card, CardContent } from "@/components/ui/card"
import { apiFetch } from "@/lib/api"
import type { Plan } from "@/lib/billing"
import { requireUser } from "@/lib/session"

async function readJson<T>(response: Response): Promise<T | null> {
  if (!response.ok) return null
  const text = await response.text()
  if (!text.trim()) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export default async function PlansPage() {
  const user = await requireUser()

  if (!user.isPlatformAdmin) redirect("/dashboard")

  const response = await apiFetch("/platform/plans")
  const plans = await readJson<Plan[]>(response)

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Planes</h1>
        <p className="text-sm text-muted-foreground">
          Configura precios, límites y visibilidad de los planes de Mishef.
        </p>
      </div>

      {plans ? (
        <PlansTable initial={plans} />
      ) : (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No pudimos cargar los planes.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
