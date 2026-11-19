"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useMoney } from "@/lib/currency"
import type { PaymentAnalyticsReport } from "@/lib/dashboard"
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/orders"

const TIP_SOURCE_LABELS: Record<string, string> = {
  NONE: "Sin propina",
  SUGGESTED: "Sugerida",
  CUSTOM: "Manual",
  CUSTOMER_DISPLAY: "Pantalla del cliente",
  TERMINAL: "Terminal Point",
}

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)} %`
}

function formatDay(value: string): string {
  const date = new Date(`${value}T12:00:00`)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
  }).format(date)
}

/**
 * Reporte de pagos y propinas.
 *
 * Solo cuenta pagos confirmados para ventas y propinas. Las cuentas divididas
 * se miden por partes creadas y partes cubiertas.
 */
export function PaymentsReport({ report }: { report: PaymentAnalyticsReport }) {
  const money = useMoney()
  const chartData = report.byDay.map((row) => ({
    date: formatDay(row.date),
    tasa:
      row.sales > 0 ? Number(((row.tips / row.sales) * 100).toFixed(2)) : 0,
  }))

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Ventas cobradas" value={money(report.totals.sales)} />
        <Metric label="Propinas" value={money(report.totals.tips)} />
        <Metric
          label="Tasa de propina"
          value={formatPercent(report.totals.tipRate)}
        />
        <Metric
          label="Ticket promedio"
          value={
            report.totals.averageTicket === null
              ? "—"
              : money(report.totals.averageTicket)
          }
        />
        <Metric
          label="Pagos con propina"
          value={`${report.totals.withTip} · ${formatPercent(
            report.totals.tipShare
          )}`}
        />
        <Metric
          label="Propina promedio"
          value={
            report.totals.averageTip === null
              ? "—"
              : money(report.totals.averageTip)
          }
        />
        <Metric
          label="Porcentaje promedio"
          value={formatPercent(report.totals.averageTipPercent)}
        />
        <Metric
          label="Pagos en partes"
          value={String(report.totals.splitPayments)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Tasa de propina por día</CardTitle>
            <CardDescription>
              Propinas sobre ventas cobradas, en porcentaje.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Sin pagos en el periodo.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    unit="%"
                  />
                  <Tooltip
                    formatter={(value) => `${value ?? 0} %`}
                  />
                  <Line
                    type="monotone"
                    dataKey="tasa"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cuentas divididas</CardTitle>
            <CardDescription>
              Partes creadas y cobradas en el periodo.
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Summary label="Cuentas" value={String(report.splits.orders)} />
              <Summary label="Partes" value={String(report.splits.parts)} />
              <Summary
                label="Partes pagadas"
                value={String(report.splits.paidParts)}
              />
              <Summary
                label="Pendientes"
                value={String(
                  Math.max(0, report.splits.parts - report.splits.paidParts)
                )}
              />
            </div>
            <div className="flex flex-col gap-1 border-t pt-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Esperado</span>
                <span className="tabular-nums">
                  {money(report.splits.expectedTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cobrado</span>
                <span className="tabular-nums">
                  {money(report.splits.paidTotal)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Propinas por método</CardTitle>
            <CardDescription>
              Ventas y propinas de pagos confirmados.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Pagos</TableHead>
                  <TableHead className="text-right">Ventas</TableHead>
                  <TableHead className="text-right">Propinas</TableHead>
                  <TableHead className="text-right">Tasa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.byMethod.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-6 text-center text-muted-foreground"
                    >
                      Sin datos.
                    </TableCell>
                  </TableRow>
                ) : (
                  report.byMethod.map((row) => (
                    <TableRow key={row.method}>
                      <TableCell>
                        {PAYMENT_METHOD_LABELS[
                          row.method as keyof typeof PAYMENT_METHOD_LABELS
                        ] ?? row.method}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.count}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(row.sales)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(row.tips)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPercent(row.tipRate)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Origen de la propina</CardTitle>
            <CardDescription>
              Cómo se eligió la propina en cada pago.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origen</TableHead>
                  <TableHead className="text-right">Pagos</TableHead>
                  <TableHead className="text-right">Propinas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.byTipSource.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-6 text-center text-muted-foreground"
                    >
                      Sin datos.
                    </TableCell>
                  </TableRow>
                ) : (
                  report.byTipSource.map((row) => (
                    <TableRow key={row.source}>
                      <TableCell>
                        {TIP_SOURCE_LABELS[row.source] ?? row.source}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.count}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(row.tips)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Propinas por receptor</CardTitle>
            <CardDescription>
              Quién registró los pagos con propina.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Persona</TableHead>
                  <TableHead className="text-right">Pagos</TableHead>
                  <TableHead className="text-right">Propinas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.topTipRecipients.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-6 text-center text-muted-foreground"
                    >
                      Sin propinas en el periodo.
                    </TableCell>
                  </TableRow>
                ) : (
                  report.topTipRecipients.map((row) => (
                    <TableRow key={row.id || row.name}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.count}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(row.tips)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pagos por estado</CardTitle>
            <CardDescription>
              Incluye pendientes, anulados y reembolsados.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Pagos</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.statuses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-6 text-center text-muted-foreground"
                    >
                      Sin datos.
                    </TableCell>
                  </TableRow>
                ) : (
                  report.statuses.map((row) => (
                    <TableRow key={row.status}>
                      <TableCell>
                        {PAYMENT_STATUS_LABELS[
                          row.status as keyof typeof PAYMENT_STATUS_LABELS
                        ] ?? row.status}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.count}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(row.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="gap-1 p-4">
        <CardDescription className="text-xs">{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}
