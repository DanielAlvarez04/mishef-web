import * as React from "react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
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
import { cn } from "cn"

type Row = Record<string, unknown>

const TOOL_LABELS: Record<string, string> = {
  ventasResumen: "Ventas",
  topPlatillos: "Platillos más vendidos",
  metodosDePago: "Métodos de pago",
  margenPorPlatillo: "Márgenes",
  costeoReceta: "Costo de receta",
  desempenoDeMenus: "Desempeño de menús",
  stockBajo: "Stock bajo",
  consumoPorInsumo: "Consumo por insumo",
  mermas: "Mermas",
  diferencias: "Diferencias de inventario",
  rotacion: "Rotación",
  tiemposDeCocina: "Tiempos de cocina",
  cuellosDeBotella: "Cuellos de botella",
}

const COLUMN_LABELS: Record<string, string> = {
  name: "Nombre",
  ingredient: "Insumo",
  item: "Artículo",
  menu: "Menú",
  quantity: "Cantidad",
  consumed: "Consumo",
  currentStock: "Existencia",
  minStock: "Mínimo",
  deficit: "Faltante",
  unit: "Unidad",
  revenue: "Ingresos",
  total: "Total",
  cost: "Costo",
  margin: "Margen",
  marginPct: "Margen %",
  foodCostPct: "Food cost",
  daysOfInventory: "Días de inventario",
  turns: "Rotaciones",
  reason: "Motivo",
  count: "Registros",
  date: "Fecha",
  status: "Estado",
  stage: "Etapa",
  minutes: "Minutos",
  method: "Método",
  soldItems: "Artículos vendidos",
  totalItems: "Artículos en menú",
  createdAt: "Fecha",
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isPrimitive(value: unknown): boolean {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—"

  if (typeof value === "number") {
    return new Intl.NumberFormat("es-MX", {
      maximumFractionDigits: 2,
    }).format(value)
  }

  if (typeof value === "boolean") return value ? "Sí" : "No"
  if (typeof value === "string") return value

  if (Array.isArray(value)) {
    return value.map(formatCell).join(", ")
  }

  if (isRecord(value)) {
    return String(value.name ?? value.label ?? value.reason ?? "—")
  }

  return String(value)
}

function flattenScalars(record: Record<string, unknown>) {
  const entries: Array<[string, unknown]> = []

  for (const [key, value] of Object.entries(record)) {
    if (isPrimitive(value)) {
      entries.push([key, value])
      continue
    }

    if (isRecord(value)) {
      for (const [childKey, childValue] of Object.entries(value)) {
        if (isPrimitive(childValue)) {
          entries.push([`${key}.${childKey}`, childValue])
        }
      }
    }
  }

  return entries
}

function chooseRows(record: Record<string, unknown>): {
  key: string | null
  rows: Row[]
} {
  const candidates = Object.entries(record).filter(
    ([, value]) =>
      Array.isArray(value) &&
      value.length > 0 &&
      value.every((row) => isRecord(row))
  ) as Array<[string, Row[]]>

  if (candidates.length === 0) {
    return { key: null, rows: [] }
  }

  const preferred = ["items", "menus", "consumption", "rows", "byReason", "byDay"]

  for (const key of preferred) {
    const match = candidates.find(([candidate]) => candidate === key)
    if (match) return { key: match[0], rows: match[1] }
  }

  return { key: candidates[0][0], rows: candidates[0][1] }
}

function columnsFor(rows: Row[]): string[] {
  const columns = new Set<string>()

  for (const row of rows.slice(0, 5)) {
    for (const key of Object.keys(row)) {
      if (isPrimitive(row[key]) || Array.isArray(row[key])) {
        columns.add(key)
      }
    }
  }

  return [...columns].slice(0, 5)
}

function numericColumn(rows: Row[], columns: string[]): string | null {
  for (const column of columns) {
    if (rows.some((row) => typeof row[column] === "number")) {
      return column
    }
  }

  return null
}

function labelColumn(rows: Row[], columns: string[]): string | null {
  for (const candidate of ["name", "ingredient", "item", "menu", "date", "method", "stage", "reason"]) {
    if (columns.includes(candidate)) return candidate
  }

  return columns.find((column) => rows.some((row) => typeof row[column] === "string")) ?? null
}

/**
 * Tarjeta genérica para el resultado estructurado de una tool.
 *
 * No reemplaza la respuesta del modelo: la complementa con la tabla o la barra
 * que el usuario puede escanear. Solo muestra las primeras filas para no
 * convertir el chat en un reporte.
 */
export function ToolResultCard({
  name,
  data,
}: {
  name: string
  data: unknown
}) {
  if (!isRecord(data)) return null

  const { key, rows } = chooseRows(data)
  const columns = columnsFor(rows)
  const numeric = numericColumn(rows, columns)
  const label = labelColumn(rows, columns)
  const scalars = flattenScalars(data).filter(
    ([scalarKey]) => scalarKey !== key && !scalarKey.includes(".")
  )
  const nestedScalars = flattenScalars(data).filter(([scalarKey]) =>
    scalarKey.includes(".")
  )

  const visibleRows = rows.slice(0, 8)
  const chartRows =
    numeric && rows.length > 1
      ? rows
          .map((row) => ({
            label: label ? formatCell(row[label]) : "—",
            value: Number(row[numeric] ?? 0),
          }))
          .filter((row) => Number.isFinite(row.value))
      : []
  const max = chartRows.reduce(
    (current, row) => Math.max(current, row.value),
    0
  )

  if (
    rows.length === 0 &&
    scalars.length === 0 &&
    nestedScalars.length === 0
  ) {
    return null
  }

  return (
    <Card className="my-2 bg-background/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          {TOOL_LABELS[name] ?? name}
          <Badge variant="secondary">Datos</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {scalars.length > 0 || nestedScalars.length > 0 ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            {[...scalars, ...nestedScalars].slice(0, 6).map(([key, value]) => (
              <div key={key} className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground">
                  {COLUMN_LABELS[key.split(".").pop() ?? key] ?? key}
                </dt>
                <dd className="font-medium tabular-nums">
                  {formatCell(value)}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {chartRows.length > 1 && max > 0 ? (
          <div className="flex h-24 items-end gap-1">
            {chartRows.slice(0, 14).map((row, index) => (
              <div
                key={`${row.label}-${index}`}
                className="flex min-w-0 flex-1 flex-col items-center gap-1"
                title={`${row.label}: ${formatCell(row.value)}`}
              >
                <div
                  className={cn(
                    "w-full rounded-t bg-primary/70",
                    row.value === max ? "bg-primary" : ""
                  )}
                  style={{
                    height: `${Math.max(4, (row.value / max) * 100)}%`,
                  }}
                />
                <span className="w-full truncate text-center text-[10px] text-muted-foreground">
                  {row.label}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {rows.length > 0 && columns.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column}>
                      {COLUMN_LABELS[column] ?? column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map((row, index) => (
                  <TableRow key={index}>
                    {columns.map((column) => (
                      <TableCell key={column} className="tabular-nums">
                        {formatCell(row[column])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.length > visibleRows.length ? (
              <p className="mt-2 text-xs text-muted-foreground">
                +{rows.length - visibleRows.length} registros más en la
                respuesta.
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
