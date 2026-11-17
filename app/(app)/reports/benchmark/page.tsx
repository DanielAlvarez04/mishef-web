import Link from "next/link"
import { redirect } from "next/navigation"

import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { apiFetch } from "@/lib/api"
import { formatMetric, type BenchmarkReport } from "@/lib/benchmark"
import { canReadMoney } from "@/lib/orders"
import { requireUser } from "@/lib/session"
import { cn } from "cn"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const PERIODS = [7, 30, 90] as const

export default async function BenchmarkPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const user = await requireUser()

  if (!canReadMoney(user.roles)) {
    redirect("/reports")
  }

  const params = await searchParams
  const raw = Array.isArray(params.days) ? params.days[0] : params.days
  const parsed = Number(raw)
  const days = PERIODS.find((value) => value === parsed) ?? 30

  const response = await apiFetch(`/reports/benchmark?days=${days}`)
  const report = response.ok ? ((await response.json()) as BenchmarkReport) : null

  if (!report) {
    return (
      <div className="@container/main flex flex-1 items-center justify-center px-4 py-10">
        <p className="text-sm text-muted-foreground">
          No pudimos cargar el benchmark.
        </p>
      </div>
    )
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Benchmark</h1>
          <p className="text-sm text-muted-foreground">
            Tu negocio frente a negocios similares. Solo se publican percentiles
            del grupo: nunca datos de otra cuenta.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          {PERIODS.map((period) => (
            <Link
              key={period}
              href={`/reports/benchmark?days=${period}`}
              className={cn(
                buttonVariants({
                  variant: period === days ? "default" : "ghost",
                  size: "sm",
                })
              )}
            >
              {period} d
            </Link>
          ))}
        </div>
      </div>

      {!report.available ? (
        <Card>
          <CardHeader>
            <CardTitle>Todavía no hay grupo suficiente</CardTitle>
            <CardDescription>
              {report.reason === "insufficient_cohort"
                ? `Hacen falta al menos ${report.cohort?.minimum ?? 5} negocios del mismo giro con ventas en el periodo. Hoy hay ${report.cohort?.organizations ?? 0}. El benchmark se activará solo.`
                : "No pudimos identificar tu negocio."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {report.cohort?.organizations} negocios
            {report.cohort?.businessType
              ? ` de giro «${report.cohort.businessType}»`
              : ""}
            {report.cohort?.scope === "local"
              ? ` de tu zona (${report.cohort.radiusKm} km)`
              : " de todo el país"}{" "}
            · últimos {report.period.days} días
          </p>

          {report.cohort && !report.cohort.myLocation ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Mejora tu benchmark con tu ubicación
                </CardTitle>
                <CardDescription>
                  Agrega las coordenadas de tu negocio para compararte con
                  negocios de tu zona en lugar de todo el país.{" "}
                  <Link href="/settings" className="underline underline-offset-4">
                    Configurar ubicación
                  </Link>
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {report.cohort?.scope === "national" &&
          report.cohort.myLocation &&
          report.cohort.localCandidates < report.cohort.minimum ? (
            <p className="text-xs text-muted-foreground">
              Aún no hay suficientes negocios con ventas en tu zona; por ahora
              se compara con todo el país.
            </p>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-3">
            {report.metrics.map((metric) => (
              <MetricCard key={metric.key} metric={metric} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function MetricCard({
  metric,
}: {
  metric: BenchmarkReport["metrics"][number]
}) {
  // Posición relativa de cada referencia entre p25 y p90 para dibujar la barra.
  const min = metric.p25
  const max = metric.p90
  const span = Math.max(0.0001, max - min)
  const position = (value: number) =>
    `${Math.min(100, Math.max(0, ((value - min) / span) * 100))}%`

  const better =
    metric.betterWhen === "higher"
      ? metric.percentile >= 50
      : metric.percentile <= 50

  return (
    <Card>
      <CardHeader>
        <CardDescription>{metric.label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">
          {formatMetric(metric.key, metric.value)}
        </CardTitle>
        <p
          className={
            better
              ? "text-xs text-emerald-600 dark:text-emerald-400"
              : "text-xs text-amber-600 dark:text-amber-400"
          }
        >
          Percentil {metric.percentile} ·{" "}
          {metric.betterWhen === "higher"
            ? "más alto es mejor"
            : "más bajo es mejor"}
        </p>
      </CardHeader>

      <div className="px-6 pb-4">
        <div className="relative h-2 rounded-full bg-muted">
          <span
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
            style={{ left: position(metric.value) }}
          />
        </div>
        <div className="mt-2 grid grid-cols-4 text-[10px] text-muted-foreground">
          <span>p25 {formatMetric(metric.key, metric.p25)}</span>
          <span className="text-center">
            p50 {formatMetric(metric.key, metric.p50)}
          </span>
          <span className="text-center">
            p75 {formatMetric(metric.key, metric.p75)}
          </span>
          <span className="text-right">
            p90 {formatMetric(metric.key, metric.p90)}
          </span>
        </div>
      </div>
    </Card>
  )
}
