"use client"

import * as React from "react"
import { ArmchairIcon, Link2Icon, UsersIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { DiningTable } from "@/lib/tables"
import { cn } from "cn"

export type TablePickerMode = "select" | "change" | "merge"

/**
 * Selector visual de mesas.
 *
 * - `select`: abre una cuenta en una mesa libre.
 * - `change`: mueve la cuenta actual a otra mesa libre.
 * - `merge`: agrega mesas libres a la cuenta actual o une otra cuenta abierta.
 */
export function TablePicker({
  open,
  onOpenChange,
  tables,
  mode,
  currentOrderId,
  currentTableIds,
  onConfirm,
  onMergeOrder,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tables: DiningTable[]
  mode: TablePickerMode
  currentOrderId?: string | null
  currentTableIds?: string[]
  onConfirm: (tableIds: string[]) => void
  onMergeOrder?: (orderId: string) => void
}) {
  const [selected, setSelected] = React.useState<string[]>(() =>
    mode === "merge" ? [...(currentTableIds ?? [])] : []
  )
  const current = React.useMemo(
    () => new Set(currentTableIds ?? []),
    [currentTableIds]
  )
  const hasNewSelection = selected.some((id) => !current.has(id))

  const zones = React.useMemo(() => {
    const map = new Map<string, DiningTable[]>()

    for (const table of tables.filter((entry) => entry.isActive)) {
      const zone = table.zone?.trim() || "Salón"
      const list = map.get(zone) ?? []
      list.push(table)
      map.set(zone, list)
    }

    return [...map.entries()]
  }, [tables])

  function isOccupied(table: DiningTable) {
    return table.activeOrders.some((order) => order.id !== currentOrderId)
  }

  function isCurrent(table: DiningTable) {
    return current.has(table.id)
  }

  function otherOrder(table: DiningTable) {
    return table.activeOrders.find((order) => order.id !== currentOrderId) ?? null
  }

  function toggle(table: DiningTable) {
    if (isOccupied(table)) return

    if (mode === "select" || mode === "change") {
      setSelected([table.id])
      return
    }

    setSelected((previous) =>
      isCurrent(table)
        ? previous
        : previous.includes(table.id)
          ? previous.filter((id) => id !== table.id)
          : [...previous, table.id]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "select"
              ? "Elegir mesa"
              : mode === "change"
                ? "Cambiar de mesa"
                : "Juntar mesas"}
          </DialogTitle>
          <DialogDescription>
            {mode === "merge"
              ? "Agrega mesas libres a esta cuenta o une otra cuenta abierta."
              : "Las mesas ocupadas no se pueden elegir para una cuenta nueva."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
          {zones.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No hay mesas configuradas. Créalas en Configuración → Mesas.
            </p>
          ) : (
            zones.map(([zone, zoneTables]) => (
              <section key={zone} className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {zone}
                </h3>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {zoneTables.map((table) => {
                    const occupied = isOccupied(table)
                    const selectedTable = selected.includes(table.id)
                    const currentTable = isCurrent(table)
                    const mergeTarget = otherOrder(table)

                    return (
                      <button
                        key={table.id}
                        type="button"
                        disabled={
                          currentTable ||
                          (occupied && !(mode === "merge" && mergeTarget))
                        }
                        onClick={() => {
                          if (occupied && mode === "merge" && mergeTarget) {
                            onMergeOrder?.(mergeTarget.id)
                            return
                          }

                          toggle(table)
                        }}
                        className={cn(
                          "flex min-h-20 flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-colors",
                          "disabled:cursor-not-allowed",
                          selectedTable
                            ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                            : currentTable
                              ? "border-sky-500/40 bg-sky-500/10"
                              : occupied
                                ? "border-amber-500/40 bg-amber-500/10 opacity-80"
                                : "border-border bg-card hover:bg-muted/50"
                        )}
                      >
                        <span className="flex w-full items-center justify-between gap-1">
                          <span className="font-semibold">
                            Mesa {table.number}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <UsersIcon className="size-3" />
                            {table.seats}
                          </span>
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {currentTable
                            ? "Actual"
                            : occupied
                              ? mode === "merge" && mergeTarget
                                ? "Unir cuenta"
                                : "Ocupada"
                              : "Libre"}
                        </span>
                        {occupied && mode === "merge" && mergeTarget ? (
                          <Badge variant="outline" className="mt-1">
                            <Link2Icon />
                            Cuenta abierta
                          </Badge>
                        ) : null}
                        {currentTable && current.size > 1 ? (
                          <Badge variant="outline" className="mt-1">
                            <ArmchairIcon />
                            Juntada
                          </Badge>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={
              selected.length === 0 ||
              (mode !== "merge" && selected.length !== 1) ||
              (mode === "merge" && !hasNewSelection)
            }
            onClick={() => {
              onConfirm(mode === "merge" ? selected : selected.slice(0, 1))
              onOpenChange(false)
            }}
          >
            {mode === "change"
              ? "Cambiar mesa"
              : mode === "merge"
                ? "Juntar seleccionadas"
                : "Usar mesa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
