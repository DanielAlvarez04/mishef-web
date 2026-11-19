import { redirect } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { apiFetch } from "@/lib/api"
import { formatPercent, type FoodCostReport } from "@/lib/food-cost"
import { requireUser } from "@/lib/session"

const ALLOWED_ROLES = ["ADMIN", "INVENTORY_MANAGER", "CASHIER"]

export default async function FoodCostPage() {
  const user = await requireUser()

  if (!user.roles.some((role) => ALLOWED_ROLES.includes(role))) {
    redirect("/reports")
  }

  const response = await apiFetch("/catalog/items/food-cost")
  const report = response.ok ? ((await response.json()) as FoodCostReport) : null

  if (!report) {
    return (
      <div className="@container/main flex flex-1 items-center justify-center px-4 py-10">
        <p className="text-sm text-muted-foreground">
          No pudimos cargar el food cost.
        </p>
      </div>
    )
  }

  const summary = report.summary
  const sorted = [...report.items].sort((a, b) => b.foodCostPct - a.foodCostPct)

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Food cost</h1>
        <p className="text-sm text-muted-foreground">
          Costo real por artículo con el costo actual de cada insumo. El precio
          se compara sin IVA. Objetivo: {formatPercent(report.target)} o menos.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric
          label="Food cost promedio"
          value={formatPercent(summary?.averageFoodCostPct)}
        />
        <Metric
          label="Sobre el objetivo"
          value={String(summary?.aboveTarget ?? 0)}
          tone={(summary?.aboveTarget ?? 0) > 0 ? "bad" : "good"}
        />
        <Metric
          label="Sin receta"
          value={String(summary?.withoutRecipe ?? 0)}
        />
        <Metric
          label="Sin costo completo"
          value={String(summary?.incomplete ?? 0)}
          tone={(summary?.incomplete ?? 0) > 0 ? "warn" : "good"}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Artículo</th>
              <th className="px-4 py-2 text-right font-medium">Precio</th>
              <th className="px-4 py-2 text-right font-medium">Costo</th>
              <th className="px-4 py-2 text-right font-medium">Food cost</th>
              <th className="px-4 py-2 text-right font-medium">Margen</th>
              <th className="px-4 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-4 py-2">
                  <div className="flex flex-col">
                    <span className="font-medium">{row.name}</span>
                    {row.missing.length > 0 ? (
                      <span className="text-xs text-muted-foreground">
                        Sin costo: {row.missing.join(", ")}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  ${row.price.toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  ${row.cost.toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {row.complete ? formatPercent(row.foodCostPct) : "—"}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {row.complete ? `$${row.margin.toFixed(2)}` : "—"}
                </td>
                <td className="px-4 py-2">
                  {!row.hasRecipe ? (
                    <Badge variant="outline">Sin receta</Badge>
                  ) : !row.complete ? (
                    <Badge variant="outline">Falta costo</Badge>
                  ) : row.aboveTarget ? (
                    <Badge className="bg-destructive text-white">
                      Revisar
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-600 text-white">OK</Badge>
                  )}
                </td>
              </tr>
            ))}
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Todavía no hay artículos con receta.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: string
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
      </CardHeader>
    </Card>
  )
}
