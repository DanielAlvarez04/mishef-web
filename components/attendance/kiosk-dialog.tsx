"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2Icon,
  ClockIcon,
  Loader2Icon,
  LogInIcon,
  LogOutIcon,
  ShieldAlertIcon,
  UtensilsIcon,
} from "lucide-react"
import { toast } from "sonner"

import { getKiosk, kioskPunch } from "@/app/(app)/attendance/actions"
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
import { Input } from "@/components/ui/input"
import type { KioskData, KioskEmployee, PunchAction } from "@/lib/attendance"

const STATUS_LABEL: Record<KioskEmployee["status"], string> = {
  OFF: "Fuera",
  WORKING: "En turno",
  ON_BREAK: "En comida",
  DONE: "Turno cerrado",
}

function getCoords(): Promise<{ latitude?: number; longitude?: number }> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return Promise.resolve({})
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 5_000 },
    )
  })
}

/**
 * Checador operado por una cuenta habilitada.
 *
 * Solo lista a las personas con turno asignado hoy. El PIN identifica al
 * empleado; la cuenta que opera queda registrada en el log.
 */
export function KioskDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [data, setData] = React.useState<KioskData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [selected, setSelected] = React.useState<KioskEmployee | null>(null)
  const [pin, setPin] = React.useState("")
  const [pending, setPending] = React.useState<PunchAction | null>(null)
  const [message, setMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return

    let cancelled = false

    async function run() {
      const result = await getKiosk()

      if (cancelled) return

      if (!result.ok || !result.data) {
        setData(null)
        toast.error(result.message ?? "No pudimos abrir el checador")
        setLoading(false)
        return
      }

      setData(result.data)
      setLoading(false)
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [open])

  async function punch(action: PunchAction) {
    if (!selected) return

    if (!/^\d{4,8}$/.test(pin)) {
      toast.error("Escribe el PIN de 4 a 8 dígitos")
      return
    }

    setPending(action)
    const coords = await getCoords()
    const result = await kioskPunch({
      userId: selected.id,
      pin,
      action,
      ...coords,
      idempotencyKey: crypto.randomUUID(),
    })

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo registrar la checada")
      setPending(null)
      return
    }

    const noun =
      action === "CLOCK_IN"
        ? "Entrada"
        : action === "LUNCH_START"
          ? "Comida"
          : action === "LUNCH_END"
            ? "Regreso"
            : "Salida"

    setMessage(`${noun} registrada para ${selected.name ?? selected.username ?? "empleado"}`)
    toast.success(`${noun} registrada`)

    const nextStatus: KioskEmployee["status"] =
      action === "CLOCK_IN"
        ? "WORKING"
        : action === "LUNCH_START"
          ? "ON_BREAK"
          : action === "LUNCH_END"
            ? "WORKING"
            : "DONE"

    setData((current) =>
      current
        ? {
            ...current,
            employees: current.employees.map((row) =>
              row.id === selected.id ? { ...row, status: nextStatus } : row,
            ),
          }
        : current,
    )

    setPin("")
    setPending(null)
    setSelected(null)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClockIcon className="size-4" /> Checador
          </DialogTitle>
          <DialogDescription>
            Elige a la persona y escribe su PIN. Solo aparecen los turnos
            asignados para hoy.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" /> Cargando turnos…
          </p>
        ) : !data ? (
          <p className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <ShieldAlertIcon className="mt-0.5 size-4 shrink-0" />
            No pudimos cargar el checador.
          </p>
        ) : data.employees.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No hay turnos asignados para hoy. Un administrador debe publicar el
            horario del día.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {message ? (
              <p className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2Icon className="size-4" />
                {message}
              </p>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data.employees.map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => {
                    setSelected(employee)
                    setPin("")
                    setMessage(null)
                  }}
                  className={`flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors ${
                    selected?.id === employee.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">
                      {employee.name ?? employee.username ?? "Empleado"}
                    </span>
                    <Badge
                      variant={
                        employee.status === "OFF" || employee.status === "DONE"
                          ? "outline"
                          : "secondary"
                      }
                    >
                      {STATUS_LABEL[employee.status]}
                    </Badge>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {employee.scheduledStart}–{employee.scheduledEnd} ·{" "}
                    {employee.breakMinutes} min comida
                  </span>
                </button>
              ))}
            </div>

            {selected ? (
              <div className="flex flex-col gap-3 rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {selected.name ?? selected.username}
                  </span>
                  <Badge variant="outline">{STATUS_LABEL[selected.status]}</Badge>
                </div>

                <Input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="PIN del empleado"
                  maxLength={8}
                  value={pin}
                  onChange={(event) =>
                    setPin(event.target.value.replace(/\D/g, "").slice(0, 8))
                  }
                />

                <div className="flex flex-wrap gap-2">
                  {selected.status === "DONE" ? (
                    <p className="text-sm text-muted-foreground">
                      El turno de hoy ya se cerró. Si faltan horas, un
                      administrador puede ajustarlas desde Registros.
                    </p>
                  ) : null}

                  {selected.status === "OFF" ? (
                    <Button
                      type="button"
                      onClick={() => void punch("CLOCK_IN")}
                      disabled={pending !== null}
                    >
                      {pending === "CLOCK_IN" ? (
                        <Loader2Icon className="animate-spin" />
                      ) : (
                        <LogInIcon />
                      )}
                      Entrada
                    </Button>
                  ) : null}

                  {selected.status === "WORKING" ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void punch("LUNCH_START")}
                      disabled={pending !== null}
                    >
                      {pending === "LUNCH_START" ? (
                        <Loader2Icon className="animate-spin" />
                      ) : (
                        <UtensilsIcon />
                      )}
                      Salir a comer
                    </Button>
                  ) : null}

                  {selected.status === "ON_BREAK" ? (
                    <Button
                      type="button"
                      onClick={() => void punch("LUNCH_END")}
                      disabled={pending !== null}
                    >
                      {pending === "LUNCH_END" ? (
                        <Loader2Icon className="animate-spin" />
                      ) : (
                        <UtensilsIcon />
                      )}
                      Regresar
                    </Button>
                  ) : null}

                  {selected.status === "WORKING" ||
                  selected.status === "ON_BREAK" ? (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => void punch("CLOCK_OUT")}
                      disabled={pending !== null}
                    >
                      {pending === "CLOCK_OUT" ? (
                        <Loader2Icon className="animate-spin" />
                      ) : (
                        <LogOutIcon />
                      )}
                      Salida
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Selecciona una persona para registrar su checada.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
