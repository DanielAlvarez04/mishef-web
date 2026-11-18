"use server"

import { mutateApi, readApi, type ActionResult } from "@/lib/server-api"
import type {
  BillingInterval,
  Plan,
  Subscription,
  SubscriptionPayment,
  UpgradeQuote,
} from "@/lib/billing"

const PATHS = ["/billing", "/dashboard", "/settings", "/plans", "/subscriptions"]

export async function getBillingPlans(): Promise<ActionResult<Plan[]>> {
  return readApi<Plan[]>("/billing/plans")
}

export async function getBillingSubscription(): Promise<ActionResult<Subscription>> {
  return readApi<Subscription>("/billing/subscription")
}

export async function getUpgradeQuote(
  planCode: string,
  interval: BillingInterval
): Promise<ActionResult<UpgradeQuote>> {
  return readApi<UpgradeQuote>(
    `/billing/quote?planCode=${encodeURIComponent(planCode)}&interval=${interval}`
  )
}

export async function subscribePlan(input: {
  planCode: string
  interval: BillingInterval
  payerEmail: string
}): Promise<
  ActionResult<{
    initPoint: string
    preapprovalId: string
    quote: UpgradeQuote
  }>
> {
  return mutateApi("/billing/subscribe", "POST", input, PATHS)
}

export async function changePlan(input: {
  planCode: string
  interval: BillingInterval
}): Promise<
  ActionResult<{
    initPoint: string | null
    preapprovalId: string | null
    quote: UpgradeQuote
    applied: boolean
  }>
> {
  return mutateApi("/billing/change-plan", "POST", input, PATHS)
}

export async function cancelSubscription(): Promise<ActionResult<Subscription>> {
  return mutateApi<Subscription>("/billing/cancel", "POST", undefined, PATHS)
}

export async function pauseSubscription(): Promise<ActionResult<Subscription>> {
  return mutateApi<Subscription>("/billing/pause", "POST", undefined, PATHS)
}

export async function resumeSubscription(): Promise<ActionResult<Subscription>> {
  return mutateApi<Subscription>("/billing/resume", "POST", undefined, PATHS)
}

export async function syncSubscription(): Promise<ActionResult<Subscription>> {
  return mutateApi<Subscription>("/billing/sync", "POST", undefined, PATHS)
}

export async function getSubscriptionPayments(): Promise<
  ActionResult<SubscriptionPayment[]>
> {
  return readApi<SubscriptionPayment[]>("/billing/payments")
}
