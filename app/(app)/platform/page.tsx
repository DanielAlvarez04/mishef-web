import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowRightIcon,
  Building2Icon,
  CalendarClockIcon,
  CircleDollarSignIcon,
  ReceiptTextIcon,
  SparklesIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { apiFetch } from "@/lib/api"
import {
  SUBSCRIPTION_STATUS_LABELS,
  formatMoney,
  type PlatformOrganization,
  type SubscriptionStatus,
} from "@/lib/billing"
import { requireUser } from "@/lib/session"

/** Negocios en prueba que vencen dentro de esta ventana. */
const TRIAL_WINDOW_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

const STATUS_VARIANTS: Record<
  SubscriptionStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ACTIVE: "default",
  TRIALING: "secondary",
  PAST_DUE: "destructive",
  PAUSED: "outline",
  CANCELED: "outline",
  EXPIRED: "outline",
}

const dateFormat = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

function daysUntil(value: string | null): number | null {
  if (!value) return null
  return Math.max(
    0,
    Math.ceil((new Date(value).getTime() - new Date().getTime()) / DAY_MS)
  )
}

function monthlyRevenue(organization: PlatformOrganization): number {
  const plan = organization.plan
  if (!plan || organization.status !== "ACTIVE") return 0

  const price =
    organization.interval === "YEAR" ? plan.priceYearly / 12 : plan.priceMonthly
  const quantity = plan.perBranch ? Math.max(1, organization.quantity) : 1

  return price * quantity
}

export default async function PlatformPage() {
  const user = await requireUser()

  if (!user.isPlatformAdmin) redirect("/dashboard")

  const response = await apiFetch("/platform/organizations")
  let organizations: PlatformOrganization[] | null = null

  if (response.ok) {
    const text = await response.text()
    organizations = text.trim()
      ? (JSON.parse(text) as PlatformOrganization[])
      : []
  }

  if (!organizations) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
        <h1 className="text-xl font-semibold tracking-tight">Plataforma</h1>
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No pudimos cargar los negocios.
          </CardContent>
        </Card>
      </div>
    )
  }

  // La organización interna de Mishef no es un cliente.
  const businesses = organizations.filter(
    (organization) => organization.slug !== "mishef-platform"
  )

  const active = businesses.filter((item) => item.status === "ACTIVE")
  const trialing = businesses.filter((item) => item.status === "TRIALING")
  const pastDue = businesses.filter((item) => item.status === "PAST_DUE")

  const mrr = active.reduce((sum, item) => sum + monthlyRevenue(item), 0)

  const trialLimit = new Date().getTime() + TRIAL_WINDOW_DAYS * DAY_MS
  const endingSoon = trialing
    .filter(
      (item) => item.trialEndsAt && new Date(item.trialEndsAt).getTime() <= trialLimit
    )
    .sort(
      (a, b) =>
        new Date(a.trialEndsAt ?? 0).getTime() -
        new Date(b.trialEndsAt ?? 0).getTime()
    )

  const recent = businesses.slice(0, 5)
  const currency = active[0]?.plan?.currency ?? "MXN"

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Plataforma</h1>
          <p className="text-sm text-muted-foreground">
            Negocios, pruebas y cobros de Mishef.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/plans" />}
          >
            Planes
            <ArrowRightIcon />
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/subscriptions" />}
          >
            Suscripciones
            <ArrowRightIcon />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 @3xl/main:grid-cols-4">
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Building2Icon className="size-4" /> Negocios activos
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">{active.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            de {businesses.length} registrados
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <SparklesIcon className="size-4" /> En prueba
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {trialing.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {endingSoon.length} vencen en {TRIAL_WINDOW_DAYS} días
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <CircleDollarSignIcon className="size-4" /> MRR estimado
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatMoney(mrr, currency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {active.length} suscripción(es) activa(s)
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <ReceiptTextIcon className="size-4" /> Pagos pendientes
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {pastDue.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {pastDue.length === 0
              ? "Sin cobros atrasados"
              : "Requieren seguimiento"}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 @3xl/main:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClockIcon className="size-4" /> Pruebas por vencer
            </CardTitle>
            <CardDescription>
              Negocios en trial que terminan en los próximos{" "}
              {TRIAL_WINDOW_DAYS} días.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {endingSoon.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Ninguna prueba vence en este periodo.
              </p>
            ) : (
              endingSoon.map((organization) => {
                const days = daysUntil(organization.trialEndsAt)

                return (
                  <div
                    key={organization.id}
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">
                        {organization.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {organization.plan?.name ?? "Sin plan"} ·{" "}
                        {organization.branches} sucursal(es)
                      </span>
                    </div>
                    <Badge variant={days !== null && days <= 2 ? "destructive" : "secondary"}>
                      {days === null
                        ? "Sin fecha"
                        : days === 0
                          ? "Vence hoy"
                          : `${days} día(s)`}
                    </Badge>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2Icon className="size-4" /> Últimos negocios
            </CardTitle>
            <CardDescription>Altas más recientes en la plataforma.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {recent.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Todavía no hay negocios registrados.
              </p>
            ) : (
              recent.map((organization) => (
                <div
                  key={organization.id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">
                      {organization.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {organization.slug} ·{" "}
                      {dateFormat.format(new Date(organization.createdAt))}
                    </span>
                  </div>
                  {organization.status ? (
                    <Badge variant={STATUS_VARIANTS[organization.status]}>
                      {SUBSCRIPTION_STATUS_LABELS[organization.status]}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Sin suscripción</Badge>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Los ajustes manuales de plan, vigencia y periodo se hacen en{" "}
        <Link href="/subscriptions" className="underline underline-offset-4">
          Suscripciones
        </Link>
        .
      </p>
    </div>
  )
}
