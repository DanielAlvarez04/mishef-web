import Link from "next/link"
import { CircleAlertIcon, SparklesIcon } from "lucide-react"

import { apiFetch } from "@/lib/api"
import { SUBSCRIPTION_STATUS_LABELS, type Subscription } from "@/lib/billing"

async function readSubscription(): Promise<Subscription | null> {
  const response = await apiFetch("/billing/subscription")
  if (!response.ok) return null
  const text = await response.text()
  if (!text.trim()) return null
  try {
    return JSON.parse(text) as Subscription
  } catch {
    return null
  }
}

/** Aviso de prueba por vencer o suscripción vencida. */
export async function BillingBanner({ enabled }: { enabled: boolean }) {
  if (!enabled) return null

  const subscription = await readSubscription()
  if (!subscription || subscription.isLegacy) return null

  const trialEnding =
    subscription.status === "TRIALING" && subscription.daysLeft <= 7
  const problem =
    subscription.status === "PAST_DUE" ||
    subscription.status === "EXPIRED" ||
    (!subscription.canWrite && subscription.status !== "TRIALING")

  if (!trialEnding && !problem) return null

  const message =
    subscription.status === "TRIALING"
      ? `Te quedan ${subscription.daysLeft} día(s) de prueba del plan ${subscription.plan.name}.`
      : subscription.status === "PAST_DUE"
        ? `No pudimos cobrar tu suscripción. Te quedan ${subscription.daysLeft} día(s) de gracia.`
        : `Tu suscripción está ${SUBSCRIPTION_STATUS_LABELS[subscription.status].toLowerCase()}. La cuenta está en solo lectura.`

  return (
    <div className="border-b bg-amber-500/10 px-4 py-2 text-sm lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
          {subscription.status === "TRIALING" ? (
            <SparklesIcon className="size-4" />
          ) : (
            <CircleAlertIcon className="size-4" />
          )}
          {message}
        </span>
        <Link
          href="/billing"
          className="font-medium text-amber-900 underline underline-offset-4 dark:text-amber-200"
        >
          Ver facturación
        </Link>
      </div>
    </div>
  )
}
