"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CheckIcon,
  ClipboardListIcon,
  Loader2Icon,
  PlusIcon,
  ShieldAlertIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  adjustShift,
  getShiftEvents,
  reviewShift,
  squareShift,
} from "@/app/(app)/attendance/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { ShiftRow } from "@/lib/attendance"

const EVENT_LABEL: Record<string, string> = {
  CLOCK_IN: "Entrada",
  LUNCH_START: "Salida a comer",
  LUNCH_END: "Regreso de comer",
  BREAK_START: "Inicio de descanso",
  BREAK_END: "Fin de descanso",
  CLOCK_OUT: "Salida",
  ADJUSTMENT: "Ajuste de horas",
  REVIEW: "Autorización",
}

/**
 * Acciones de administración sobre un turno.
 *
 * El log de checadas es inmutable: aquí solo se agregan minutos positivos,
 * se autoriza una checada fuera de zona o se consulta el historial.
 */
export function ShiftAdminActions({ shift }: { shift: ShiftRow }) {
  const router = useRouter()
  const [adjustOpen, setAdjustOpen] = React.useState(false)
  const [squareOpen, setSquareOpen] = React.useState(false)
  const [reviewOpen, setReviewOpen] = React.useState(false)
  const [logOpen, setLogOpen] = React.useState(false)
  const [minutes, setMinutes] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [pending, setPending] = React.useState<string | null>(null)
  const [events, setEvents] = React.useState<
    Array<{
      id: string
      type: string
      occurredAt: string
      note: string | null
      source: string
      recordedBy?: {
        id: string
        name: string | null
        username: string | null
      } | null
    }>
  >([])

  async function adjust() {
    const value = Number(minutes)

    if (!Number.isInteger(value) || value <= 0) {
      toast.error("Agrega una cantidad positiva de minutos")
      return
    }

    if (reason.trim().length < 3) {
      toast.error("Escribe el motivo del ajuste")
      return
    }

    setPending("adjust")
    const result = await adjustShift(shift.id, {
      minutes: value,
      reason: reason.trim(),
    })

    if (!result.ok) {
      toast.error(result.message ?? "No pudimos ajustar el turno")
    } else {
      toast.success("Minutos agregados al turno")
      setAdjustOpen(false)
      setMinutes("")
      setReason("")
      router.refresh()
    }
    setPending(null)
  }

  async function square() {
    setPending("square")
    const result = await squareShift(shift.id)

    if (!result.ok) {
      toast.error(result.message ?? "No pudimos cuadrar el turno")
    } else {
      toast.success("Horas faltantes agregadas")
      router.refresh()
    }
    setPending(null)
    setSquareOpen(false)
  }

  async function review() {
    setPending("review")
    const result = await reviewShift(shift.id, true)

    if (!result.ok) {
      toast.error(result.message ?? "No pudimos autorizar la checada")
    } else {
      toast.success("Checada autorizada")
      router.refresh()
    }
    setPending(null)
    setReviewOpen(false)
  }

  async function openLog() {
    setLogOpen(true)
    const result = await getShiftEvents(shift.id)

    if (result.ok) {
      setEvents(result.data ?? [])
    } else {
      toast.error(result.message ?? "No pudimos cargar el log del turno")
    }
  }

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {shift.needsReview ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setReviewOpen(true)}
        >
          <ShieldAlertIcon />
          Autorizar
        </Button>
      ) : null}

      {shift.endedAt &&
      shift.scheduledStartedAt &&
      shift.scheduledEndedAt ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setSquareOpen(true)}
          title="Agregar los minutos faltantes hasta el horario programado"
        >
          Cuadrar
        </Button>
      ) : null}

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setAdjustOpen(true)}
      >
        <PlusIcon />
        Ajustar
      </Button>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => void openLog()}
        aria-label="Ver log del turno"
      >
        <ClipboardListIcon />
      </Button>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar minutos u horas extra</DialogTitle>
            <DialogDescription>
              Solo se pueden sumar minutos. El ajuste queda en el log y no
              modifica las checadas originales.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <Field>
              <FieldLabel htmlFor="adjust-minutes">Minutos a agregar</FieldLabel>
              <Input
                id="adjust-minutes"
                type="number"
                min="1"
                max="1440"
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="adjust-reason">Motivo</FieldLabel>
              <Input
                id="adjust-reason"
                value={reason}
                maxLength={300}
                placeholder="Ej. cubrió el cierre, horas extra autorizadas…"
                onChange={(event) => setReason(event.target.value)}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAdjustOpen(false)}
              disabled={pending !== null}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={() => void adjust()} disabled={pending !== null}>
              {pending === "adjust" ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={squareOpen} onOpenChange={setSquareOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Cuadrar horas</AlertDialogTitle>
            <AlertDialogDescription>
              Se agregarán automáticamente los minutos faltantes para llegar a
              las horas programadas. Nunca se restan horas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending !== null}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => void square()} disabled={pending !== null}>
              {pending === "square" ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
              Cuadrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Autorizar checada</AlertDialogTitle>
            <AlertDialogDescription>
              La checada quedó fuera de la zona del local. Autorizarla deja el
              registro como válido y queda en el log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending !== null}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => void review()} disabled={pending !== null}>
              {pending === "review" ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
              Autorizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Log del turno</DialogTitle>
            <DialogDescription>
              Checadas, descansos, ajustes y autorizaciones. Este historial es
              inmutable.
            </DialogDescription>
          </DialogHeader>

          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto text-sm">
            {events.length === 0 ? (
              <p className="text-muted-foreground">Sin eventos.</p>
            ) : (
              events.map((event) => (
                <div key={event.id} className="rounded-md border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {EVENT_LABEL[event.type] ?? event.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.occurredAt).toLocaleString("es-MX")}
                    </span>
                  </div>
                  {event.recordedBy ? (
                    <p className="text-xs text-muted-foreground">
                      Registró:{" "}
                      {event.recordedBy.name ??
                        event.recordedBy.username ??
                        "cuenta del checador"}
                    </p>
                  ) : null}
                  {event.note ? (
                    <p className="text-xs text-muted-foreground">{event.note}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
