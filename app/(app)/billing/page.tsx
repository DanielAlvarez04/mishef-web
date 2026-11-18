import { redirect } from "next/navigation"

import { BillingView } from "@/components/billing/billing-view"
import { Card, CardContent } from "@/components/ui/card"
import { apiFetch } from "@/lib/api"
import type { Plan, Subscription, SubscriptionPayment } from "@/lib/billing"
import { isAdmin, requireUser } from "@/lib/session"

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

export default async function BillingPage() {
  const user = await requireUser()

  // El superadmin no tiene un plan propio que gestionar: su panel es /platform.
  if (user.isPlatformAdmin) redirect("/platform")

  if (!isAdmin(user)) redirect("/dashboard")

  const [subscriptionResponse, plansResponse, paymentsResponse] =
    await Promise.all([
      apiFetch("/billing/subscription"),
      apiFetch("/billing/plans"),
      apiFetch("/billing/payments"),
    ])

  const [subscription, plans, payments] = await Promise.all([
    readJson<Subscription>(subscriptionResponse),
    readJson<Plan[]>(plansResponse),
    readJson<SubscriptionPayment[]>(paymentsResponse),
  ])

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Facturación</h1>
        <p className="text-sm text-muted-foreground">
          Plan, suscripción y pagos de tu negocio en Mishef.
        </p>
      </div>

      {!subscription || !plans ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No pudimos cargar la facturación. Recarga la página e inténtalo de
            nuevo.
          </CardContent>
        </Card>
      ) : (
        <BillingView
          subscription={subscription}
          plans={plans}
          payments={payments ?? []}
        />
      )}
    </div>
  )
}
