"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { SearchIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  type PurchaseListItem,
  purchaseStatusLabel,
  purchaseStatusVariant,
} from "@/lib/purchases"

const FILTERS = [
  { value: "ALL", label: "Todos" },
  { value: "NEEDS_REVIEW", label: "Por revisar" },
  { value: "APPROVED", label: "Aprobados" },
  { value: "REJECTED", label: "Rechazados" },
] as const

type Filter = (typeof FILTERS)[number]["value"]

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Mexico_City",
})

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date)
}

export function PurchasesList({ purchases }: { purchases: PurchaseListItem[] }) {
  const [filter, setFilter] = useState<Filter>("ALL")
  const [search, setSearch] = useState("")

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()

    return purchases.filter((purchase) => {
      if (filter !== "ALL" && purchase.status !== filter) return false

      if (!term) return true

      return (
        purchase.supplier?.name.toLowerCase().includes(term) ||
        purchase.folio?.toLowerCase().includes(term) ||
        purchase.branch?.name.toLowerCase().includes(term)
      )
    })
  }, [purchases, filter, search])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={filter === option.value ? "secondary" : "ghost"}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <div className="relative w-full max-w-64">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Proveedor, folio o sucursal"
            className="pl-8"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Fecha</th>
              <th className="px-4 py-2 font-medium">Proveedor / folio</th>
              <th className="px-4 py-2 font-medium">Sucursal</th>
              <th className="px-4 py-2 text-right font-medium">Líneas</th>
              <th className="px-4 py-2 text-right font-medium">Total</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((purchase) => (
              <tr key={purchase.id} className="border-t">
                <td className="px-4 py-2 whitespace-nowrap tabular-nums">
                  {formatDate(purchase.purchasedAt)}
                </td>
                <td className="px-4 py-2">
                  <span className="font-medium">
                    {purchase.supplier?.name ?? "Sin proveedor"}
                  </span>
                  {purchase.folio ? (
                    <span className="block text-xs text-muted-foreground">
                      Folio {purchase.folio}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {purchase.branch?.name ?? "Global"}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {purchase._count.items}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  ${Number(purchase.total).toFixed(2)}
                </td>
                <td className="px-4 py-2">
                  <Badge variant={purchaseStatusVariant(purchase.status)}>
                    {purchaseStatusLabel(purchase.status)}
                  </Badge>
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/purchases/${purchase.id}`}
                    className="text-sm underline underline-offset-4"
                  >
                    Revisar
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  No hay tickets con este filtro.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
