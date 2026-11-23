"use client"

import { useMemo, useState, useTransition } from "react"
import { Loader2Icon, RefreshCwIcon, SparklesIcon } from "lucide-react"
import { toast } from "sonner"

import {
  getComparison,
  saveSuggestionFeedback,
} from "@/app/(app)/purchases/suggestions/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { Ingredient } from "@/lib/catalog"
import {
  riskLabel,
  riskVariant,
  type ForecastRow,
  type PriceAlert,
  type SuggestionsResponse,
  type SupplierComparison,
} from "@/lib/forecast"

const money = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const precise = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 2,
})

export function SuggestionsView({
  suggestions,
  alerts,
  ingredients,
}: {
  suggestions: SuggestionsResponse | null
  alerts: PriceAlert[]
  ingredients: Ingredient[]
}) {
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (suggestions?.items ?? []).map((item) => [
        item.ingredientId,
        String(item.suggestedQuantity),
      ])
    )
  )
  const [feedback, setFeedback] = useState<Record<string, "ACCEPTED" | "ADJUSTED">>(
    {}
  )
  const [comparisonId, setComparisonId] = useState("")
  const [comparison, setComparison] = useState<SupplierComparison | null>(null)
  const [pending, startTransition] = useTransition()
  const [comparing, startComparing] = useTransition()

  const rows = useMemo(() => suggestions?.items ?? [], [suggestions])
  const urgent = rows.filter((row) => row.risk === "HIGH").length
  const adjustments = useMemo(
    () =>
      rows.filter((row) => {
        const value = Number(quantities[row.ingredientId])
        return Number.isFinite(value) && value !== row.suggestedQuantity
      }).length,
    [rows, quantities]
  )

  function accept(row: ForecastRow) {
    startTransition(async () => {
      const result = await saveSuggestionFeedback({
        kind: "SUGGESTION",
        accepted: true,
        payload: {
          ingredientId: row.ingredientId,
          suggested: row.suggestedQuantity,
        },
      })

      if (!result.ok) {
        toast.error(result.message ?? "No pudimos registrar la aceptación")
        return
      }

      toast.success(`${row.name}: sugerencia aceptada`)
      setFeedback((current) => ({ ...current, [row.ingredientId]: "ACCEPTED" }))
    })
  }

  function adjust(row: ForecastRow) {
    const value = Number(quantities[row.ingredientId])

    if (!Number.isFinite(value) || value < 0) {
      toast.error("Escribe una cantidad válida")
      return
    }

    startTransition(async () => {
      const result = await saveSuggestionFeedback({
        kind: "SUGGESTION",
        accepted: false,
        payload: {
          ingredientId: row.ingredientId,
          suggested: row.suggestedQuantity,
        },
        adjustments: { quantity: value },
      })

      if (!result.ok) {
        toast.error(result.message ?? "No pudimos guardar el ajuste")
        return
      }

      toast.success(`${row.name}: ajuste guardado`)
      setFeedback((current) => ({ ...current, [row.ingredientId]: "ADJUSTED" }))
    })
  }

  function compare() {
    if (!comparisonId) {
      toast.error("Elige un insumo")
      return
    }

    startComparing(async () => {
      const result = await getComparison(comparisonId)

      if (!result.ok || !result.data) {
        toast.error(result.message ?? "No pudimos comparar proveedores")
        return
      }

      setComparison(result.data)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Sugerencias de compra
        </h1>
        <p className="text-sm text-muted-foreground">
          Calculadas con tu consumo real, el tiempo de entrega y el stock
          actual. Ajusta la cantidad antes de usarla.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Costo estimado</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              ${money.format(suggestions?.totalEstimatedCost ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Insumos urgentes</CardDescription>
            <CardTitle className="text-2xl tabular-nums text-destructive">
              {urgent}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Cantidades ajustadas</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{adjustments}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Cambios de precio</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{alerts.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de compra sugerida</CardTitle>
          <CardDescription>
            Cobertura de {suggestions?.coverDays ?? 7} días además del tiempo de
            entrega. La cantidad sugerida es editable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Insumo</th>
                  <th className="px-3 py-2 text-right font-medium">Stock</th>
                  <th className="px-3 py-2 text-right font-medium">Consumo/día</th>
                  <th className="px-3 py-2 text-right font-medium">Cobertura</th>
                  <th className="px-3 py-2 text-right font-medium">Entrega</th>
                  <th className="px-3 py-2 text-right font-medium">Sugerido</th>
                  <th className="px-3 py-2 text-right font-medium">Costo</th>
                  <th className="px-3 py-2 font-medium">Riesgo</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.ingredientId} className="border-t align-top">
                    <td className="px-3 py-2">
                      <span className="font-medium">{row.name}</span>
                      {row.lastSupplier ? (
                        <span className="block text-xs text-muted-foreground">
                          Último: {row.lastSupplier.name}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {precise.format(row.currentStock)} {row.displayUnit}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {precise.format(row.dailyAverage)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {row.daysOfCover === null
                        ? "—"
                        : `${precise.format(row.daysOfCover)} d`}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {precise.format(row.leadTimeDays)} d
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={quantities[row.ingredientId] ?? ""}
                          onChange={(event) =>
                            setQuantities((current) => ({
                              ...current,
                              [row.ingredientId]: event.target.value,
                            }))
                          }
                          className="w-24 text-right tabular-nums"
                        />
                        <span className="text-xs text-muted-foreground">
                          {row.displayUnit}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      ${money.format(row.estimatedCost)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={riskVariant(row.risk)}>
                        {riskLabel(row.risk)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        {feedback[row.ingredientId] ? (
                          <span className="text-xs text-muted-foreground">
                            {feedback[row.ingredientId] === "ACCEPTED"
                              ? "Aceptada"
                              : "Ajustada"}
                          </span>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={pending}
                              onClick={() => accept(row)}
                            >
                              Aceptar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={pending}
                              onClick={() => adjust(row)}
                            >
                              Guardar ajuste
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-3 py-8 text-center text-sm text-muted-foreground"
                    >
                      No hay compras sugeridas: el stock cubre el consumo
                      proyectado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            <SparklesIcon className="mr-1 inline size-3" />
            {rows[0]?.explanation ??
              "El pronóstico se alimenta de consumos, mermas y compras aprobadas."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cambios de precio de proveedores</CardTitle>
          <CardDescription>
            Variaciones mayores al 5% entre las dos últimas compras aprobadas
            del mismo insumo y proveedor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Insumo</th>
                  <th className="px-3 py-2 font-medium">Proveedor</th>
                  <th className="px-3 py-2 text-right font-medium">Antes</th>
                  <th className="px-3 py-2 text-right font-medium">Ahora</th>
                  <th className="px-3 py-2 text-right font-medium">Cambio</th>
                  <th className="px-3 py-2 font-medium">Última compra</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr
                    key={`${alert.supplierId}-${alert.ingredientId}`}
                    className="border-t"
                  >
                    <td className="px-3 py-2 font-medium">{alert.ingredientName}</td>
                    <td className="px-3 py-2">{alert.supplierName}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      ${precise.format(alert.previousCost)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      ${precise.format(alert.lastCost)}
                    </td>
                    <td
                      className={
                        alert.changePercent > 0
                          ? "px-3 py-2 text-right font-medium text-destructive tabular-nums"
                          : "px-3 py-2 text-right font-medium text-emerald-600 tabular-nums dark:text-emerald-400"
                      }
                    >
                      {alert.changePercent > 0 ? "+" : ""}
                      {alert.changePercent}%
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(alert.lastPurchasedAt).toLocaleDateString("es-MX", {
                        timeZone: "UTC",
                      })}
                    </td>
                  </tr>
                ))}
                {alerts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-8 text-center text-sm text-muted-foreground"
                    >
                      Sin cambios de precio mayores al 5%.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comparación de proveedores</CardTitle>
          <CardDescription>
            Precio por unidad visible en las compras aprobadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={comparisonId}
              onChange={(event) => setComparisonId(event.target.value)}
              className="h-9 min-w-56 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="">Elige un insumo</option>
              {ingredients.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name}
                </option>
              ))}
            </select>
            <Button variant="outline" disabled={comparing} onClick={compare}>
              {comparing ? (
                <Loader2Icon data-icon="inline-start" className="animate-spin" />
              ) : (
                <RefreshCwIcon data-icon="inline-start" />
              )}
              Comparar
            </Button>
          </div>

          {comparison ? (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Proveedor</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Último precio
                    </th>
                    <th className="px-3 py-2 text-right font-medium">Promedio</th>
                    <th className="px-3 py-2 text-right font-medium">Mínimo</th>
                    <th className="px-3 py-2 text-right font-medium">Compras</th>
                    <th className="px-3 py-2 font-medium">Última</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.rows.map((row) => (
                    <tr key={row.supplierId} className="border-t">
                      <td className="px-3 py-2 font-medium">
                        {row.supplierName}
                        {comparison.best?.supplierId === row.supplierId ? (
                          <Badge variant="success" className="ml-2">
                            Mejor precio
                          </Badge>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        ${precise.format(row.lastCost)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        ${precise.format(row.averageCost)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        ${precise.format(row.minCost)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.purchases}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(row.lastPurchasedAt).toLocaleDateString("es-MX", {
                          timeZone: "UTC",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
