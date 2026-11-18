/** Tipos de planes, suscripciones y facturación de la plataforma. */

export type BillingInterval = "MONTH" | "YEAR"
export type SubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "PAUSED"
  | "CANCELED"
  | "EXPIRED"
export type SubscriptionProvider = "MERCADO_PAGO" | "MANUAL"

export interface Plan {
  id: string
  code: string
  name: string
  description: string | null
  priceMonthly: number
  priceYearly: number
  currency: string
  perBranch: boolean
  trialDays: number
  maxBranches: number | null
  maxUsersPerBranch: number | null
  maxImagesPerItem: number
  maxVideosPerItem: number
  maxStorageBytes: number | null
  maxInventoryItems: number | null
  customDomain: boolean
  isActive: boolean
  isPublic: boolean
  sortOrder: number
  features: unknown
}

export interface BillingUsage {
  branches: number
  users: number
  storageBytes: number
}

export interface Subscription {
  id: string
  status: SubscriptionStatus
  provider: SubscriptionProvider
  interval: BillingInterval
  quantity: number
  unitAmount: number
  currency: string
  providerPreapprovalId: string | null
  payerEmail: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  trialEndsAt: string | null
  graceEndsAt: string | null
  canceledAt: string | null
  pausedAt: string | null
  creditBalanceCents: number
  plan: Plan
  usage: BillingUsage
  daysLeft: number
  canWrite: boolean
  isLegacy: boolean
  nextChargeAt: string | null
}

export interface UpgradeQuote {
  creditCents: number
  amountDueCents: number
  carryOverCents: number
  targetAmountCents: number
  quantity: number
  daysRemaining: number
  newPeriodStart: string
  newPeriodEnd: string
  currentPlan: Plan
  targetPlan: Plan
  currentTotalCents: number
}

export interface SubscriptionPayment {
  id: string
  organizationId: string
  kind: string
  status: string
  amountCents: number
  currency: string
  providerPaymentId: string | null
  periodStart: string | null
  periodEnd: string | null
  paidAt: string | null
  createdAt: string
}

export interface PlatformOrganization {
  id: string
  name: string
  slug: string
  domain: string | null
  isActive: boolean
  createdAt: string
  plan: Plan | null
  status: SubscriptionStatus | null
  provider: SubscriptionProvider | null
  interval: BillingInterval | null
  quantity: number
  currentPeriodEnd: string | null
  trialEndsAt: string | null
  graceEndsAt: string | null
  branches: number
  users: number
  storageBytes: number
}

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIALING: "Prueba",
  ACTIVE: "Activo",
  PAST_DUE: "Pago pendiente",
  PAUSED: "Pausado",
  CANCELED: "Cancelado",
  EXPIRED: "Vencido",
}

export const INTERVAL_LABELS: Record<BillingInterval, string> = {
  MONTH: "Mensual",
  YEAR: "Anual",
}

export function formatMoney(value: number, currency = "MXN"): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}

export function planPrice(plan: Plan, interval: BillingInterval): number {
  return interval === "YEAR" ? plan.priceYearly : plan.priceMonthly
}

export function planQuote(plan: Plan, interval: BillingInterval): string {
  const price = planPrice(plan, interval)

  if (plan.perBranch) {
    return `${formatMoney(price, plan.currency)} / sucursal / ${
      interval === "YEAR" ? "año" : "mes"
    }`
  }

  return `${formatMoney(price, plan.currency)} / ${
    interval === "YEAR" ? "año" : "mes"
  }`
}

export function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 MB"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const index = Math.min(
    units.length - 1,
    Math.floor(Math.log(value) / Math.log(1024))
  )
  const amount = value / 1024 ** index

  return `${amount.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}
