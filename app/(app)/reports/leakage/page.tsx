import Link from "next/link"
import { redirect } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { apiFetch } from "@/lib/api"
import type { LeakageReport } from "@/lib/leakage"
import { canReadMoney } from "@/lib/orders"
import { requireUser } from "@/lib/session"
import { cn } from "cn"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const PERIODS = [7, 30, 90] as const

export default async function LeakagePage({
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

  const response = await apiFetch(`/reports/leakage?days=${days}`)
  const report = response.ok ? ((await response.json()) as LeakageReport) : null

  if (!report || !report.summary) {
    return (
      <div className="@container/main flex flex-1 items-center justify-center px-4 py-10">
        <p className="text-sm text-muted-foreground">
          No pudimos cargar las señales de fuga.
        </p>
      </div>
    )
  }

  const summary = report.summary

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Fuga interna
          </h1>
          <p className="text-sm text-muted-foreground">
            Patrones para revisar: cancelaciones, cuentas sin pago y totales que
            no coinciden con sus conceptos.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          {PERIODS.map((period) => (
            <Link
              key={period}
              href={`/reports/leakage?days=${period}`}
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Cancelaciones" value={String(summary.cancellations)} />
        <Metric
          label="Cuentas sin pago completo"
          value={String(summary.ordersWithoutPayment)}
          detail={`$${summary.missingAmount.toFixed(2)} sin cobrar`}
          tone={summary.ordersWithoutPayment > 0 ? "bad" : "good"}
        />
        <Metric
          label="Totales que no cuadran"
          value={String(summary.discounts)}
          detail={`$${summary.discountAmount.toFixed(2)} de diferencia`}
          tone={summary.discounts > 0 ? "warn" : "good"}
        />
        <Metric
          label="Personas a revisar"
          value={String(summary.usersFlagged)}
          tone={summary.usersFlagged > 0 ? "bad" : "good"}
        />
      </div>

      <Section
        title="Personas con señales"
        description="Puntaje = cancelaciones ×2 + reembolsos ×3 + cuentas sin pago ×3."
        empty="Nadie supera el umbral en el periodo."
      >
        {report.users.length > 0 ? (
          <Table
            head={["Persona", "Cancelaciones", "Reembolsos", "Sin pago", "Ventas", "Riesgo"]}
            rows={report.users.map((row) => [
              row.name ?? row.username ?? row.email ?? row.userId,
              String(row.cancellations),
              String(row.refunds),
              String(row.ordersWithoutPayment),
              `$${row.sales.toFixed(2)}`,
              String(row.riskScore),
            ])}
          />
        ) : null}
      </Section>

      <Section
        title="Cuentas cerradas sin el pago completo"
        description="La suma de pagos confirmados no coincide con el total de la cuenta."
        empty="Todas las cuentas cerradas están pagadas."
      >
        {report.ordersWithoutPayment.length > 0 ? (
          <Table
            head={["Ticket", "Mesa", "Total", "Pagado", "Falta", "Fecha"]}
            rows={report.ordersWithoutPayment.map((row) => [
              row.ticketNumber ? `#${row.ticketNumber}` : "—",
              row.tableNumber ?? "—",
              `$${row.total.toFixed(2)}`,
              `$${row.paid.toFixed(2)}`,
              `$${row.missing.toFixed(2)}`,
              new Date(row.createdAt).toLocaleDateString("es-MX"),
            ])}
          />
        ) : null}
      </Section>

      <Section
        title="Totales que no cuadran"
        description="El total es menor que la suma de conceptos: descuento o ajuste no registrado."
        empty="No hay diferencias entre el total y los conceptos."
      >
        {report.discounts.length > 0 ? (
          <Table
            head={["Ticket", "Esperado", "Total", "Diferencia", "Fecha"]}
            rows={report.discounts.map((row) => [
              row.ticketNumber ? `#${row.ticketNumber}` : "—",
              `$${row.expected.toFixed(2)}`,
              `$${row.total.toFixed(2)}`,
              `$${row.difference.toFixed(2)}`,
              new Date(row.createdAt).toLocaleDateString("es-MX"),
            ])}
          />
        ) : null}
      </Section>
    </div>
  )
}

function Metric({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string
  value: string
  detail?: string
  tone?: "neutral" | "good" | "warn" | "bad"
}) {
  const color =
    tone === "bad"
      ? "text-destructive"
      : tone === "good"
        ? "text-emerald-600 dark:text-emerald-400"
        : tone === "warn"
          ? "text-amber-600 dark:text-amber-400"
          : ""

  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className={`text-2xl tabular-nums ${color}`}>
          {value}
        </CardTitle>
        {detail ? (
          <p className="text-xs text-muted-foreground">{detail}</p>
        ) : null}
      </CardHeader>
    </Card>
  )
}

function Section({
  title,
  description,
  empty,
  children,
}: {
  title: string
  description: string
  empty: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children ?? (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          {empty}
        </div>
      )}
    </div>
  )
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {head.map((cell) => (
              <th key={cell} className="px-4 py-2 font-medium">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`px-4 py-2 ${cellIndex === 0 ? "font-medium" : "tabular-nums"}`}
                >
                  {cellIndex === row.length - 1 && head.length === 6 ? (
                    <Badge variant="outline">{cell}</Badge>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
