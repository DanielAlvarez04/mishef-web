"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon, PencilIcon } from "lucide-react"
import { toast } from "sonner"

import { updateShift } from "@/app/(app)/attendance/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { ShiftRow } from "@/lib/attendance"

/** Convierte un ISO a `YYYY-MM-DDTHH:mm` en la zona local. */
function toLocalInput(value: string | null): string {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const pad = (part: number) => String(part).padStart(2, "0")

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/**
 * Corrección manual de un turno.
 *
 * Sirve para arreglar una salida olvidada o una entrada mal capturada. Solo se
 * muestra a ADMIN; la API valida cruces y números negativos.
 */
export function ShiftEditDialog({ shift }: { shift: ShiftRow }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [startedAt, setStartedAt] = React.useState("")
  const [endedAt, setEndedAt] = React.useState("")
  const [note, setNote] = React.useState("")
  const [pending, setPending] = React.useState(false)

  function openDialog() {
    setStartedAt(toLocalInput(shift.startedAt))
    setEndedAt(toLocalInput(shift.endedAt))
    setNote(shift.note ?? "")
    setOpen(true)
  }

  async function submit() {
    if (!startedAt) {
      toast.error("Escribe la entrada")
      return
    }

    const startIso = new Date(startedAt).toISOString()
    const endIso = endedAt ? new Date(endedAt).toISOString() : null
    const nextNote = note.trim() || null

    const patch: {
      startedAt?: string
      endedAt?: string | null
      note?: string | null
    } = {}

    if (startIso !== new Date(shift.startedAt).toISOString()) {
      patch.startedAt = startIso
    }
    if (endIso !== (shift.endedAt ? new Date(shift.endedAt).toISOString() : null)) {
      patch.endedAt = endIso
    }
    if (nextNote !== (shift.note ?? null)) {
      patch.note = nextNote
    }

    if (Object.keys(patch).length === 0) {
      toast.info("Sin cambios")
      return
    }

    setPending(true)

    try {
      const result = await updateShift(shift.id, patch)

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo corregir el turno")
        return
      }

      toast.success("Turno corregido")
      setOpen(false)
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Corregir turno"
        onClick={openDialog}
      >
        <PencilIcon />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Corregir turno</DialogTitle>
            <DialogDescription>
              Ajusta la entrada o la salida si alguien olvidó checar. La salida
              vacía deja el turno abierto.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <Field>
              <FieldLabel htmlFor={`shift-start-${shift.id}`}>
                Entrada
              </FieldLabel>
              <Input
                id={`shift-start-${shift.id}`}
                type="datetime-local"
                value={startedAt}
                onChange={(event) => setStartedAt(event.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor={`shift-end-${shift.id}`}>
                Salida (vacía = sigue abierto)
              </FieldLabel>
              <Input
                id={`shift-end-${shift.id}`}
                type="datetime-local"
                value={endedAt}
                onChange={(event) => setEndedAt(event.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor={`shift-note-${shift.id}`}>Nota</FieldLabel>
              <Input
                id={`shift-note-${shift.id}`}
                value={note}
                maxLength={200}
                placeholder="Turno tarde, cubrió a…"
                onChange={(event) => setNote(event.target.value)}
              />
              <FieldDescription>
                No puede cruzarse con otro turno del mismo usuario.
              </FieldDescription>
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={() => void submit()} disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              Guardar corrección
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
