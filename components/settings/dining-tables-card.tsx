"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import type { ActionResult } from "@/lib/server-api"
import {
  createDiningTable,
  deleteDiningTable,
  updateDiningTable,
  type DiningTableInput,
} from "@/lib/table-actions"
import type { DiningTable } from "@/lib/tables"

export function DiningTablesCard({
  tables,
  canManage,
}: {
  tables: DiningTable[]
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [editing, setEditing] = React.useState<DiningTable | null>(null)
  const [number, setNumber] = React.useState("")
  const [zone, setZone] = React.useState("")
  const [seats, setSeats] = React.useState("4")
  const [deleting, setDeleting] = React.useState<DiningTable | null>(null)

  function reset() {
    setEditing(null)
    setNumber("")
    setZone("")
    setSeats("4")
  }

  function startEdit(table: DiningTable) {
    setEditing(table)
    setNumber(table.number)
    setZone(table.zone ?? "")
    setSeats(String(table.seats))
  }

  function run(
    action: () => Promise<ActionResult<unknown>>,
    success: string
  ) {
    startTransition(async () => {
      const result = await action()

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo guardar la mesa")
        return
      }

      toast.success(success)
      reset()
      router.refresh()
    })
  }

  function submit() {
    const nextSeats = Number(seats)

    if (!number.trim()) {
      toast.error("Escribe el número de mesa")
      return
    }

    if (!Number.isInteger(nextSeats) || nextSeats < 1 || nextSeats > 50) {
      toast.error("Los asientos deben ser un entero entre 1 y 50")
      return
    }

    if (!editing) {
      run(
        () =>
          createDiningTable({
            number: number.trim(),
            zone: zone.trim() || null,
            seats: nextSeats,
          }),
        "Mesa creada"
      )
      return
    }

    const changes: DiningTableInput = {}
    if (number.trim() !== editing.number) changes.number = number.trim()
    if ((zone.trim() || null) !== editing.zone) changes.zone = zone.trim() || null
    if (nextSeats !== editing.seats) changes.seats = nextSeats

    if (Object.keys(changes).length === 0) {
      toast.info("Sin cambios")
      reset()
      return
    }

    run(() => updateDiningTable(editing.id, changes), "Mesa actualizada")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mesas</CardTitle>
        <CardDescription>
          Mesas del salón con asientos y zona. Las mesas ocupadas no se pueden
          elegir para una cuenta nueva; se pueden juntar desde el POS.
        </CardDescription>
        <Badge variant="outline" className="w-fit">
          {tables.filter((table) => table.isActive).length} activas
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {canManage ? (
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
            <span className="text-sm font-medium">
              {editing ? `Editar Mesa ${editing.number}` : "Nueva mesa"}
            </span>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem_auto] sm:items-end">
              <Field>
                <FieldLabel htmlFor="table-number">Número</FieldLabel>
                <Input
                  id="table-number"
                  value={number}
                  onChange={(event) => setNumber(event.target.value)}
                  placeholder="4"
                  maxLength={20}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="table-zone">Zona</FieldLabel>
                <Input
                  id="table-zone"
                  value={zone}
                  onChange={(event) => setZone(event.target.value)}
                  placeholder="Salón"
                  maxLength={40}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="table-seats">Asientos</FieldLabel>
                <Input
                  id="table-seats"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={50}
                  value={seats}
                  onChange={(event) => setSeats(event.target.value)}
                />
              </Field>
              <div className="flex items-center gap-2">
                {editing ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={reset}
                    aria-label="Cancelar edición"
                  >
                    <XIcon />
                  </Button>
                ) : null}
                <Button
                  type="button"
                  onClick={submit}
                  disabled={pending || !number.trim()}
                >
                  {pending ? (
                    <Loader2Icon className="animate-spin" />
                  ) : editing ? (
                    <PencilIcon />
                  ) : (
                    <PlusIcon />
                  )}
                  {editing ? "Guardar" : "Agregar"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {tables.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin mesas todavía.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {tables.map((table) => (
              <li
                key={table.id}
                className="flex flex-wrap items-center gap-3 px-3 py-2.5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    Mesa {table.number}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {table.zone || "Sin zona"} · {table.seats} asiento
                    {table.seats === 1 ? "" : "s"} ·{" "}
                    {table.activeOrders.length > 0
                      ? `${table.activeOrders.length} cuenta(s) abierta(s)`
                      : "Libre"}
                  </span>
                </span>
                <Badge variant={table.isActive ? "secondary" : "outline"}>
                  {table.isActive ? "Activa" : "Inactiva"}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => startEdit(table)}
                  disabled={!canManage || pending}
                  aria-label={`Editar Mesa ${table.number}`}
                >
                  <PencilIcon />
                </Button>
                <Switch
                  checked={table.isActive}
                  disabled={!canManage || pending}
                  onCheckedChange={(checked) =>
                    run(
                      () =>
                        updateDiningTable(table.id, { isActive: checked }),
                      checked ? "Mesa activada" : "Mesa desactivada"
                    )
                  }
                  aria-label={`Activar Mesa ${table.number}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleting(table)}
                  disabled={!canManage || pending}
                  aria-label={`Eliminar Mesa ${table.number}`}
                >
                  <Trash2Icon />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {!canManage ? (
          <p className="text-xs text-muted-foreground">
            Solo administración puede crear o cambiar mesas.
          </p>
        ) : null}
      </CardContent>

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>¿Eliminar mesa?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `La Mesa ${deleting.number} se eliminará. Si tiene cuentas asociadas, primero desactívala.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!deleting) return
                run(
                  () => deleteDiningTable(deleting.id),
                  "Mesa eliminada"
                )
                setDeleting(null)
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
