"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ClockIcon,
  CoffeeIcon,
  Loader2Icon,
  LogInIcon,
  LogOutIcon,
  ScanFaceIcon,
  UtensilsIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  clockIn,
  clockOut,
  endBreak,
  startBreak,
} from "@/app/(app)/attendance/actions"
import { KioskDialog } from "@/components/attendance/kiosk-dialog"
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
import {
  clockTime,
  formatMinutes,
  type AttendanceSettings,
  type PersonalScheduleEntry,
  type ShiftRow,
} from "@/lib/attendance"

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
 * Checador personal.
 *
 * Los botones cambian según el estado. La ubicación se pide solo al marcar y,
 * si queda fuera de la geocerca, la API deja la checada marcada para revisión.
 */
export function ClockCard({
  current,
  todayShift,
  todaySchedule,
  settings,
  kioskEnabled,
}: {
  current: ShiftRow | null
  todayShift: ShiftRow | null
  todaySchedule: PersonalScheduleEntry | null
  settings: AttendanceSettings | null
  kioskEnabled: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [note, setNote] = React.useState("")
  const [kioskOpen, setKioskOpen] = React.useState(false)

  const openBreak = current?.breaks?.find((row) => !row.endedAt) ?? null
  const closedToday = !current && todayShift?.endedAt ? todayShift : null
  const status = closedToday
    ? "Turno cerrado"
    : !current
      ? "Fuera"
      : openBreak
        ? openBreak.type === "LUNCH"
          ? "En comida"
          : "En descanso"
        : "En turno"

  function execute(
    action: (
      noteValue: string,
      coords: { latitude?: number; longitude?: number },
    ) => Promise<{ ok: boolean; message?: string }>,
    success: string,
  ) {
    startTransition(async () => {
      const coords = await getCoords()
      const result = await action(note, coords)

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo registrar la checada")
        return
      }

      toast.success(success)
      setNote("")
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClockIcon className="size-4" /> Mi turno
        </CardTitle>
        <CardDescription>
          Marca tu entrada, comida y salida. Las tolerancias del negocio se
          aplican automáticamente.
        </CardDescription>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={current ? "default" : closedToday ? "secondary" : "outline"}
          >
            {status}
          </Badge>
          {settings?.attendanceApplyTolerance ? (
            <Badge variant="secondary">Tolerancias activas</Badge>
          ) : (
            <Badge variant="outline">Hora exacta</Badge>
          )}
          {kioskEnabled ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setKioskOpen(true)}
            >
              <ScanFaceIcon data-icon="inline-start" />
              Checador
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {todaySchedule ? (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <span className="font-medium">
              Hoy: {todaySchedule.startTime}–{todaySchedule.endTime}
            </span>
            <span className="text-muted-foreground">
              {" · "}
              {todaySchedule.breakMinutes} min de comida
            </span>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            No tienes un horario asignado para hoy.
          </p>
        )}

        {current ? (
          <div className="flex flex-col gap-1 rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-medium">
              Entrada {clockTime(current.startedAt)}
              {openBreak
                ? ` · ${openBreak.type === "LUNCH" ? "comida" : "descanso"} desde ${clockTime(openBreak.startedAt)}`
                : ""}
            </p>
            <p className="text-muted-foreground">
              Trabajado: {formatMinutes(current.workedMinutes ?? 0)}
              {current.needsReview ? " · pendiente de autorizar" : ""}
            </p>
            {current.withinGeofence === false ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                La checada quedó fuera de la zona del local y requiere
                autorización del administrador.
              </p>
            ) : null}
          </div>
        ) : null}

        {closedToday ? (
          <div className="flex flex-col gap-1 rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Turno de hoy cerrado</p>
            <p className="text-muted-foreground">
              Entrada {clockTime(closedToday.startedAt)} · salida{" "}
              {clockTime(closedToday.endedAt)} ·{" "}
              {formatMinutes(closedToday.workedMinutes ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              Si faltan horas, un administrador puede agregarlas desde
              Registros.
            </p>
          </div>
        ) : null}

        {closedToday ? null : (
          <Input
            placeholder="Nota opcional: cubrí a Ana, turno tarde…"
            value={note}
            maxLength={200}
            onChange={(event) => setNote(event.target.value)}
          />
        )}

        <div className="flex flex-wrap gap-2">
          {closedToday ? null : !current ? (
            <Button
              type="button"
              onClick={() => execute(clockIn, "Entrada registrada")}
              disabled={pending}
            >
              {pending ? <Loader2Icon className="animate-spin" /> : <LogInIcon />}
              Marcar entrada
            </Button>
          ) : openBreak ? (
            <Button
              type="button"
              onClick={() => execute(endBreak, "Regreso registrado")}
              disabled={pending}
            >
              {pending ? <Loader2Icon className="animate-spin" /> : <UtensilsIcon />}
              {openBreak.type === "LUNCH" ? "Regresar de comida" : "Terminar descanso"}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  execute(
                    (noteValue, coords) => startBreak("LUNCH", noteValue, coords),
                    "Comida iniciada",
                  )
                }
                disabled={pending}
              >
                <UtensilsIcon />
                Salir a comer
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  execute(
                    (noteValue, coords) => startBreak("REST", noteValue, coords),
                    "Descanso iniciado",
                  )
                }
                disabled={pending}
              >
                <CoffeeIcon />
                Descanso
              </Button>
            </>
          )}

          {current ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => execute(clockOut, "Salida registrada")}
              disabled={pending}
            >
              {pending ? <Loader2Icon className="animate-spin" /> : <LogOutIcon />}
              Marcar salida
            </Button>
          ) : null}
        </div>

        {current && (current.breaks?.length ?? 0) > 0 ? (
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            {current.breaks?.map((row) => (
              <span key={row.id}>
                {row.type === "LUNCH" ? "Comida" : "Descanso"}:{" "}
                {clockTime(row.startedAt)}–{clockTime(row.endedAt)}
                {row.effectiveMinutes !== null
                  ? ` · ${row.effectiveMinutes} min`
                  : " · en curso"}
              </span>
            ))}
          </div>
        ) : null}
      </CardContent>

      <KioskDialog
        key={kioskOpen ? "open" : "closed"}
        open={kioskOpen}
        onOpenChange={setKioskOpen}
      />
    </Card>
  )
}
