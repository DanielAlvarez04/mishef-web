"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ScanEyeIcon, TriangleAlertIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ANOMALY_SEVERITY_LABELS,
  ANOMALY_TYPE_LABELS,
  anomalySeverityVariant,
  evidenceText,
  type AnomalyResponse,
  type AnomalySeverity,
} from "@/lib/anomalies"

const FILTERS: Array<{ value: "ALL" | AnomalySeverity; label: string }> = [
  { value: "ALL", label: "Todas" },
  { value: "HIGH", label: "Alta" },
  { value: "MEDIUM", label: "Media" },
  { value: "LOW", label: "Baja" },
]

const money = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function AnomaliesView({ data }: { data: AnomalyResponse | null }) {
  const [severity, setSeverity] = useState<"ALL" | AnomalySeverity>("ALL")

  const findings = useMemo(() => {
    const rows = data?.findings ?? []

    if (severity === "ALL") return rows

    return rows.filter((finding) => finding.severity === severity)
  }, [data, severity])

  if (!data) {
    return (
      <Card className="max-w-md self-center text-center">
        <CardHeader className="items-center">
          <TriangleAlertIcon className="size-6 text-destructive" />
          <CardTitle>No se pudieron cargar las anomalías</CardTitle>
          <CardDescription>
            La API no respondió correctamente. Comprueba que esté en marcha e
            inténtalo de nuevo.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Anomalías</h1>
        <p className="text-sm text-muted-foreground">
          Reglas explicables sobre descuentos, cancelaciones, caja y mermas. Cada
          hallazgo incluye la evidencia para revisarlo.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Hallazgos</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {data.summary.total}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Prioridad alta</CardDescription>
            <CardTitle className="text-2xl tabular-nums text-destructive">
              {data.summary.high}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Descuentos</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              ${money.format(data.summary.discounts)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Diferencia de caja</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              ${money.format(data.summary.cashDifference)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {FILTERS.map((filter) => (
          <Button
            key={filter.value}
            type="button"
            size="sm"
            variant={severity === filter.value ? "secondary" : "ghost"}
            onClick={() => setSeverity(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {new Date(data.from).toLocaleDateString("es-MX", {
            timeZone: "UTC",
          })}{" "}
          —{" "}
          {new Date(data.to).toLocaleDateString("es-MX", {
            timeZone: "UTC",
          })}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {findings.map((finding) => (
          <Card key={finding.id}>
            <CardHeader className="gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={anomalySeverityVariant(finding.severity)}>
                  {ANOMALY_SEVERITY_LABELS[finding.severity]}
                </Badge>
                <Badge variant="outline">
                  {ANOMALY_TYPE_LABELS[finding.type]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Puntaje {finding.score}/100
                </span>
                {finding.link ? (
                  <Button
                    variant="ghost"
                    size="xs"
                    className="ml-auto"
                    render={<Link href={finding.link} />}
                  >
                    Ver evidencia
                  </Button>
                ) : null}
              </div>
              <CardTitle className="text-base">{finding.title}</CardTitle>
              <CardDescription>{finding.detail}</CardDescription>
            </CardHeader>
            <CardContent>
              <details className="text-sm">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                  Evidencia
                </summary>
                <div className="mt-2 grid gap-1 rounded-lg border bg-muted/20 p-3 text-xs sm:grid-cols-2">
                  {Object.entries(finding.evidence).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="break-words">{evidenceText(value)}</span>
                    </div>
                  ))}
                </div>
              </details>
            </CardContent>
          </Card>
        ))}

        {findings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <ScanEyeIcon className="size-5" />
              No hay anomalías con este filtro.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
