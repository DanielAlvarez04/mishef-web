"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CheckCircle2Icon,
  ClockIcon,
  Loader2Icon,
  LogInIcon,
  LogOutIcon,
  RefreshCwIcon,
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
import { getCurrentCoordinates } from "@/lib/geolocation"
import type { KioskData, KioskEmployee, PunchAction } from "@/lib/attendance"

const STATUS_LABEL: Record<KioskEmployee["status"], string> = {
  OFF: "Fuera",
  WORKING: "En turno",
  ON_BREAK: "En comida",
  DONE: "Turno cerrado",
}

/** UUID con respaldo para navegadores sin `crypto.randomUUID` (HTTP). */
function idempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `kiosk-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Acción que dispara Enter al escribir el PIN.
 *
 * En turno se elige "salir a comer" porque es el primer botón; la salida se
 * registra con el botón rojo.
 */
function primaryAction(status: KioskEmployee["status"]): PunchAction | null {
  switch (status) {
    case "OFF":
      return "CLOCK_IN"
    case "WORKING":
      return "LUNCH_START"
    case "ON_BREAK":
      return "LUNCH_END"
    default:
      return null
  }
}

/**
 * Checador operado por una cuenta habilitada.
 *
 * Lista todas las cuentas activas del negocio y muestra el horario de quienes
 * tienen turno asignado hoy. El PIN identifica al empleado; la cuenta que opera
 * queda registrada en el log.
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
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)
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
        setLoadError(result.message ?? "No pudimos abrir el checador")
        toast.error(result.message ?? "No pudimos abrir el checador")
        setLoading(false)
        return
      }

      setData(result.data)
      setLoadError(null)
      setLoading(false)
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [open, reloadKey])

  function reload() {
    setLoading(true)
    setSelected(null)
    setPin("")
    setMessage(null)
    setLoadError(null)
    setReloadKey((current) => current + 1)
  }

  async function punch(action: PunchAction) {
    if (!selected || pending !== null) return

    if (!selected.hasPin) {
      toast.error(
        "Esa cuenta no tiene PIN. Configúralo desde Usuarios o en Ajustes.",
      )
      return
    }

    if (selected.pinLocked) {
      toast.error("El PIN está bloqueado por intentos fallidos. Espera unos minutos.")
      return
    }

    if (!/^\d{4,8}$/.test(pin)) {
      toast.error("Escribe el PIN de 4 a 8 dígitos")
      return
    }

    setPending(action)
    const coords = await getCurrentCoordinates()
    const result = await kioskPunch({
      userId: selected.id,
      pin,
      action,
      ...coords,
      idempotencyKey: idempotencyKey(),
    })

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo registrar la checada")
      setPin("")
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

  const needsPin = data?.employees.some((employee) => !employee.hasPin) ?? false
  const selectedAction = selected ? primaryAction(selected.status) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClockIcon className="size-4" /> Checador
          </DialogTitle>
          <DialogDescription>
            Aparecen todas las cuentas activas. Quienes tienen turno hoy
            muestran su horario; el PIN identifica a la persona.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" /> Cargando turnos…
          </p>
        ) : !data ? (
          <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <p className="flex items-start gap-2">
              <ShieldAlertIcon className="mt-0.5 size-4 shrink-0" />
              {loadError ?? "No pudimos cargar el checador."}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              nativeButton={false}
              render={<Link href="/attendance" />}
            >
              Ir a mi checador
            </Button>
          </div>
        ) : data.employees.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No hay cuentas activas en el negocio.
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
              {data.employees.map((employee) => {
                const blocked = !employee.hasPin || employee.pinLocked

                return (
                  <button
                    key={employee.id}
                    type="button"
                    disabled={blocked}
                    onClick={() => {
                      if (blocked) return
                      setSelected(employee)
                      setPin("")
                      setMessage(null)
                    }}
                    className={`flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors ${
                      blocked
                        ? "cursor-not-allowed opacity-60"
                        : selected?.id === employee.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">
                        {employee.name ?? employee.username ?? "Empleado"}
                      </span>
                      <span className="flex shrink-0 gap-1">
                        {!employee.hasPin ? (
                          <Badge variant="destructive">Sin PIN</Badge>
                        ) : null}
                        {employee.pinLocked ? (
                          <Badge variant="outline">PIN bloqueado</Badge>
                        ) : null}
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
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {employee.scheduledStart && employee.scheduledEnd
                        ? `${employee.scheduledStart}–${employee.scheduledEnd} · ${employee.breakMinutes ?? 0} min comida`
                        : "Sin horario asignado hoy"}
                    </span>
                  </button>
                )
              })}
            </div>

            {needsPin ? (
              <p className="text-xs text-muted-foreground">
                Las cuentas con “Sin PIN” no pueden checar. Un administrador
                puede configurarlo desde Usuarios; cada persona también puede
                definirlo en Ajustes → PIN de caja y checador.
              </p>
            ) : null}

            {data.employees.some((employee) => employee.pinLocked) ? (
              <p className="text-xs text-muted-foreground">
                Los PIN bloqueados se liberan solos después de unos minutos.
                Pulsa Actualizar para volver a intentarlo.
              </p>
            ) : null}

            {selected ? (
              <div className="flex flex-col gap-3 rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {selected.name ?? selected.username}
                  </span>
                  <Badge variant="outline">{STATUS_LABEL[selected.status]}</Badge>
                </div>

                {!selected.scheduledStart ? (
                  <p className="text-xs text-muted-foreground">
                    Sin horario asignado hoy: se registra la hora real y un
                    administrador puede ajustar las horas después.
                  </p>
                ) : null}

                {selected.status === "DONE" ? (
                  <p className="text-sm text-muted-foreground">
                    El turno de hoy ya se cerró. Si faltan horas, un
                    administrador puede ajustarlas desde Registros.
                  </p>
                ) : (
                  <>
                    <Input
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                      autoFocus
                      placeholder="PIN del empleado"
                      maxLength={8}
                      value={pin}
                      onChange={(event) =>
                        setPin(event.target.value.replace(/\D/g, "").slice(0, 8))
                      }
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" || !selectedAction) return
                        event.preventDefault()
                        void punch(selectedAction)
                      }}
                    />

                    <p className="text-xs text-muted-foreground">
                      Escribe el PIN y pulsa Enter para registrar la acción
                      principal, o elige un botón.
                    </p>
                  </>
                )}

                <div className="flex flex-wrap gap-2">
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
          <Button
            type="button"
            variant="outline"
            onClick={reload}
            disabled={loading || pending !== null}
          >
            <RefreshCwIcon className={loading ? "animate-spin" : undefined} />
            Actualizar
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
