import { redirect } from "next/navigation"

import { SubscriptionsTable } from "@/components/billing/subscriptions-table"
import { Card, CardContent } from "@/components/ui/card"
import { apiFetch } from "@/lib/api"
import type { Plan, PlatformOrganization } from "@/lib/billing"
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

export default async function SubscriptionsPage() {
  const user = await requireUser()

  if (!user.isPlatformAdmin) redirect("/dashboard")

  const [organizationsResponse, plansResponse] = await Promise.all([
    apiFetch("/platform/organizations"),
    apiFetch("/platform/plans"),
  ])

  const [organizations, plans] = await Promise.all([
    readJson<PlatformOrganization[]>(organizationsResponse),
    readJson<Plan[]>(plansResponse),
  ])

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Suscripciones</h1>
        <p className="text-sm text-muted-foreground">
          Negocios, planes y ajustes manuales de facturación.
        </p>
      </div>

      {organizations && plans ? (
        <SubscriptionsTable initial={organizations} plans={plans} />
      ) : (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No pudimos cargar los negocios.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
