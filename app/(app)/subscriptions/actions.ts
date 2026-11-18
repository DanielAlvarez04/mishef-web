"use server"

import { mutateApi, readApi, type ActionResult } from "@/lib/server-api"
import type {
  BillingInterval,
  PlatformOrganization,
  Subscription,
  SubscriptionStatus,
} from "@/lib/billing"

const PATHS = ["/subscriptions", "/plans", "/billing"]

export async function getPlatformOrganizations(search?: string): Promise<
  ActionResult<PlatformOrganization[]>
> {
  const query = search?.trim()
    ? `?search=${encodeURIComponent(search.trim())}`
    : ""

  return readApi<PlatformOrganization[]>(`/platform/organizations${query}`)
}

export async function updateOrganizationSubscription(
  organizationId: string,
  input: {
    planCode?: string
    status?: SubscriptionStatus
    interval?: BillingInterval
    quantity?: number
    currentPeriodEnd?: string | null
    trialEndsAt?: string | null
    graceEndsAt?: string | null
    payerEmail?: string | null
  }
): Promise<ActionResult<Subscription>> {
  return mutateApi<Subscription>(
    `/platform/organizations/${organizationId}/subscription`,
    "PATCH",
    input,
    PATHS
  )
}
