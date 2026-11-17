"use client"

import * as React from "react"
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  Loader2Icon,
  SaveIcon,
  SendIcon,
  ShieldCheckIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  copySchedule,
  getSchedule,
  publishSchedule,
  saveSchedule,
  setKioskOperators,
  updateAttendanceSettings,
} from "@/app/(app)/attendance/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Switch } from "@/components/ui/switch"
import { diffFields, isEmptyPatch, sameNumber } from "@/lib/diff"
import type {
  AttendanceSettings,
  ScheduleEmployee,
  ScheduleEntryRow,
  ShiftTemplateRow,
  WeekSchedule,
} from "@/lib/attendance"

function dateKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function dayLabel(date: Date): string {
  return date.toLocaleDateString("es-MX", {
    weekday: "short",
    day: "2-digit",
  })
}

function shiftMinutes(startTime: string, endTime: string, breakMinutes: number): number {
  const [sh, sm] = startTime.split(":").map(Number)
  const [eh, em] = endTime.split(":").map(Number)
  const start = sh * 60 + sm
  let end = eh * 60 + em

  if (end <= start) end += 24 * 60

  return Math.max(0, end - start - breakMinutes)
}

function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${hours}h ${rest}min`
}

/** Los minutos llegan como texto desde los inputs; se comparan numéricamente. */
function sameTolerance(left: unknown, right: unknown): boolean {
  return sameNumber(left as number, right as number)
}

/** Convierte las filas locales al payload que espera la API. */
function schedulePayload(entries: ScheduleEntryRow[]) {
  return entries.map((entry) => ({
    userId: entry.userId,
    date: entry.date.slice(0, 10),
    startTime: entry.startTime,
    endTime: entry.endTime,
    breakMinutes: entry.breakMinutes,
    note: entry.note ?? undefined,
  }))
}

/**
 * Parrilla semanal de horarios.
 *
 * Empleados en filas, días en columnas. Un click en una celda abre el editor
 * de turno. Cada cambio se guarda solo; publicar lo muestra en el calendario
 * del equipo.
 */
export function ScheduleBoard({
  initial,
  canManage,
}: {
  initial: WeekSchedule
  canManage: boolean
}) {
  const [data, setData] = React.useState(initial)
  const [entries, setEntries] = React.useState<ScheduleEntryRow[]>(
    initial.entries,
  )
  const [weekStart, setWeekStart] = React.useState(initial.weekStart)
  const [pending, setPending] = React.useState<string | null>(null)
  const [editor, setEditor] = React.useState<{
    employee: ScheduleEmployee
    date: string
    entry: ScheduleEntryRow | null
  } | null>(null)
  const [confirmPublish, setConfirmPublish] = React.useState(false)
  const [kioskOpen, setKioskOpen] = React.useState(false)

  const start = new Date(`${weekStart}T00:00:00`)
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index))
  const entryFor = (userId: string, date: string) =>
    entries.find((entry) => entry.userId === userId && entry.date.slice(0, 10) === date) ??
    null

  async function loadWeek(nextStart: string) {
    setPending("week")
    const result = await getSchedule(nextStart)

    if (!result.ok || !result.data) {
      toast.error(result.message ?? "No pudimos cargar el horario")
    } else {
      setData(result.data)
      setEntries(result.data.entries)
      setWeekStart(result.data.weekStart)
    }

    setPending(null)
  }

  function saveEntry(next: ScheduleEntryRow) {
    const nextEntries = [
      ...entries.filter(
        (entry) =>
          !(entry.userId === next.userId && entry.date.slice(0, 10) === next.date.slice(0, 10)),
      ),
      next,
    ]

    setEntries(nextEntries)
    setEditor(null)
    void persistSchedule(nextEntries, "Horario guardado")
  }

  function removeEntry(userId: string, date: string) {
    const nextEntries = entries.filter(
      (entry) => !(entry.userId === userId && entry.date.slice(0, 10) === date),
    )

    setEntries(nextEntries)
    setEditor(null)
    void persistSchedule(nextEntries, "Horario guardado")
  }

  async function persistSchedule(
    nextEntries: ScheduleEntryRow[],
    successMessage?: string,
  ): Promise<boolean> {
    setPending("autosave")
    const result = await saveSchedule({
      weekStart,
      branchId: data.branchId,
      entries: schedulePayload(nextEntries),
    })

    if (!result.ok || !result.data) {
      toast.error(result.message ?? "No pudimos guardar el horario")
      setPending(null)
      return false
    }

    setData(result.data)
    setEntries(result.data.entries)
    setWeekStart(result.data.weekStart)
    if (successMessage) toast.success(successMessage)
    setPending(null)
    return true
  }

  async function saveDraft() {
    await persistSchedule(entries, "Horario guardado")
  }

  async function doPublish() {
    setPending("publish")
    const saved = await saveSchedule({
      weekStart,
      branchId: data.branchId,
      entries: schedulePayload(entries),
    })

    if (!saved.ok) {
      toast.error(saved.message ?? "No pudimos guardar el horario")
      setPending(null)
      return
    }

    const result = await publishSchedule({
      weekStart,
      branchId: data.branchId,
    })

    if (!result.ok || !result.data) {
      toast.error(result.message ?? "No pudimos publicar el horario")
    } else {
      setData(result.data)
      setEntries(result.data.entries)
      toast.success("Horario publicado")
    }

    setPending(null)
    setConfirmPublish(false)
  }

  async function copyPrevious() {
    const previous = dateKey(addDays(start, -7))
    setPending("copy")
    const result = await copySchedule({
      fromWeekStart: previous,
      weekStart,
      branchId: data.branchId,
    })

    if (!result.ok || !result.data) {
      toast.error(result.message ?? "No pudimos copiar la semana anterior")
    } else {
      setData(result.data)
      setEntries(result.data.entries)
      toast.success("Semana copiada")
    }
    setPending(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDaysIcon className="size-4" /> Horarios
          </CardTitle>
          <CardDescription>
            Turnos por persona y día. Los cambios se guardan automáticamente.
            Un solo turno por día; la comida se descuenta de las horas. El
            checador usa el horario guardado; publicar solo lo muestra al
            equipo.
          </CardDescription>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Semana anterior"
              onClick={() => void loadWeek(dateKey(addDays(start, -7)))}
              disabled={pending !== null}
            >
              <ChevronLeftIcon />
            </Button>
            <span className="min-w-40 text-center text-sm font-medium">
              {start.toLocaleDateString("es-MX", {
                day: "2-digit",
                month: "short",
              })}{" "}
              –{" "}
              {addDays(start, 6).toLocaleDateString("es-MX", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Semana siguiente"
              onClick={() => void loadWeek(dateKey(addDays(start, 7)))}
              disabled={pending !== null}
            >
              <ChevronRightIcon />
            </Button>
            <Badge variant={data.status === "PUBLISHED" ? "default" : "outline"}>
              {data.status === "PUBLISHED" ? "Publicado" : "Borrador"}
            </Badge>
            {pending === "autosave" ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2Icon className="size-3 animate-spin" /> Guardando…
              </span>
            ) : null}

            {canManage ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copyPrevious()}
                  disabled={pending !== null}
                >
                  {pending === "copy" ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <CopyIcon />
                  )}
                  Copiar anterior
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void saveDraft()}
                  disabled={pending !== null}
                >
                  {pending === "save" || pending === "autosave" ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <SaveIcon />
                  )}
                  Guardar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setConfirmPublish(true)}
                  disabled={pending !== null || entries.length === 0}
                >
                  {pending === "publish" ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <SendIcon />
                  )}
                  Publicar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setKioskOpen(true)}
                  disabled={pending !== null}
                >
                  <ShieldCheckIcon />
                  Cuentas del checador
                </Button>
              </>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="sticky left-0 z-10 bg-muted/40 px-4 py-2 font-medium">
                    Empleado
                  </th>
                  {days.map((day) => (
                    <th key={dateKey(day)} className="px-2 py-2 font-medium">
                      {dayLabel(day)}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-right font-medium">Horas</th>
                </tr>
              </thead>
              <tbody>
                {data.employees.map((employee) => {
                  const minutes = entries
                    .filter((entry) => entry.userId === employee.id)
                    .reduce(
                      (sum, entry) =>
                        sum +
                        shiftMinutes(
                          entry.startTime,
                          entry.endTime,
                          entry.breakMinutes,
                        ),
                      0,
                    )

                  return (
                    <tr key={employee.id} className="border-t">
                      <td className="sticky left-0 z-10 bg-background px-4 py-2 font-medium">
                        <div className="flex flex-col">
                          <span>{employee.name ?? employee.username}</span>
                          <span className="text-xs font-normal text-muted-foreground">
                            {employee.roles.join(", ")}
                          </span>
                        </div>
                      </td>
                      {days.map((day) => {
                        const key = dateKey(day)
                        const entry = entryFor(employee.id, key)

                        return (
                          <td key={key} className="px-1 py-1 align-top">
                            <button
                              type="button"
                              disabled={!canManage || pending !== null}
                              onClick={() =>
                                setEditor({ employee, date: key, entry })
                              }
                              className={`flex min-h-12 w-full flex-col items-start rounded-md border px-2 py-1 text-left text-xs transition-colors ${
                                entry
                                  ? "border-primary/30 bg-primary/5"
                                  : "border-dashed text-muted-foreground hover:bg-muted/60"
                              } ${!canManage ? "cursor-default" : ""}`}
                            >
                              {entry ? (
                                <>
                                  <span className="font-medium text-foreground">
                                    {entry.startTime}–{entry.endTime}
                                  </span>
                                  <span>{entry.breakMinutes} min comida</span>
                                </>
                              ) : (
                                <span>+ Turno</span>
                              )}
                            </button>
                          </td>
                        )
                      })}
                      <td className="px-4 py-2 text-right tabular-nums">
                        {minutes > 0 ? formatHours(minutes) : "—"}
                      </td>
                    </tr>
                  )
                })}
                {data.employees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-sm text-muted-foreground"
                    >
                      No hay personal activo.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AttendanceSettingsCard
        settings={data.settings}
        canManage={canManage}
        onSaved={(settings) =>
          setData((current) =>
            current ? { ...current, settings } : current,
          )
        }
      />

      {editor ? (
        <ScheduleEntryDialog
          employee={editor.employee}
          date={editor.date}
          entry={editor.entry}
          templates={data.templates}
          defaultBreak={data.settings.attendanceDefaultBreakMinutes}
          onClose={() => setEditor(null)}
          onSave={saveEntry}
          onRemove={
            editor.entry
              ? () => removeEntry(editor.employee.id, editor.date)
              : undefined
          }
        />
      ) : null}

      <KioskOperatorsDialog
        key={kioskOpen ? "open" : "closed"}
        open={kioskOpen}
        onOpenChange={setKioskOpen}
        employees={data.employees}
        initial={data.kioskOperators}
        onSaved={(userIds) =>
          setData((current) =>
            current ? { ...current, kioskOperators: userIds } : current,
          )
        }
      />

      <AlertDialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Publicar horario</AlertDialogTitle>
            <AlertDialogDescription>
              El equipo verá estos turnos en su calendario. ¿Publicar la semana
              del {start.toLocaleDateString("es-MX")}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending !== null}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void doPublish()}
              disabled={pending !== null}
            >
              {pending === "publish" ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <SendIcon />
              )}
              Publicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ScheduleEntryDialog({
  employee,
  date,
  entry,
  templates,
  defaultBreak,
  onClose,
  onSave,
  onRemove,
}: {
  employee: ScheduleEmployee
  date: string
  entry: ScheduleEntryRow | null
  templates: ShiftTemplateRow[]
  defaultBreak: number
  onClose: () => void
  onSave: (entry: ScheduleEntryRow) => void
  onRemove?: () => void
}) {
  const [startTime, setStartTime] = React.useState(entry?.startTime ?? "09:00")
  const [endTime, setEndTime] = React.useState(entry?.endTime ?? "18:00")
  const [breakMinutes, setBreakMinutes] = React.useState(
    String(entry?.breakMinutes ?? defaultBreak),
  )
  const [note, setNote] = React.useState(entry?.note ?? "")

  function submit() {
    if (startTime === endTime) {
      toast.error("La entrada y la salida no pueden ser iguales")
      return
    }

    onSave({
      id: entry?.id ?? `local-${employee.id}-${date}`,
      userId: employee.id,
      date,
      startTime,
      endTime,
      breakMinutes: Number(breakMinutes) || 0,
      note: note.trim() || null,
    })
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Turno de {employee.name ?? employee.username}</DialogTitle>
          <DialogDescription>
            {new Date(`${date}T00:00:00`).toLocaleDateString("es-MX", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
          </DialogDescription>
        </DialogHeader>

        {templates.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {templates.map((template) => (
              <Button
                key={template.id}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setStartTime(template.startTime)
                  setEndTime(template.endTime)
                  setBreakMinutes(String(template.breakMinutes))
                }}
              >
                {template.name} · {template.startTime}–{template.endTime}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="schedule-start">Entrada</FieldLabel>
            <Input
              id="schedule-start"
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="schedule-end">Salida</FieldLabel>
            <Input
              id="schedule-end"
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="schedule-break">Comida (minutos)</FieldLabel>
          <Input
            id="schedule-break"
            type="number"
            min="0"
            max="240"
            value={breakMinutes}
            onChange={(event) => setBreakMinutes(event.target.value)}
          />
          <FieldDescription>
            Se descuenta de la jornada. Puede ser 0 si no hay comida.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="schedule-note">Nota</FieldLabel>
          <Input
            id="schedule-note"
            value={note}
            maxLength={200}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>

        <DialogFooter>
          {onRemove ? (
            <Button type="button" variant="destructive" onClick={onRemove}>
              Quitar turno
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={submit}>
            Guardar turno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AttendanceSettingsCard({
  settings,
  canManage,
  onSaved,
}: {
  settings: AttendanceSettings
  canManage: boolean
  onSaved: (settings: AttendanceSettings) => void
}) {
  const [apply, setApply] = React.useState(settings.attendanceApplyTolerance)
  const [late, setLate] = React.useState(String(settings.attendanceLateGraceMinutes))
  const [lunch, setLunch] = React.useState(String(settings.attendanceLunchGraceMinutes))
  const [early, setEarly] = React.useState(String(settings.attendanceEarlyLeaveGraceMinutes))
  const [breakDefault, setBreakDefault] = React.useState(
    String(settings.attendanceDefaultBreakMinutes),
  )
  const [baseline, setBaseline] = React.useState({
    applyTolerance: settings.attendanceApplyTolerance,
    lateGraceMinutes: settings.attendanceLateGraceMinutes,
    lunchGraceMinutes: settings.attendanceLunchGraceMinutes,
    earlyLeaveGraceMinutes: settings.attendanceEarlyLeaveGraceMinutes,
    defaultBreakMinutes: settings.attendanceDefaultBreakMinutes,
  })
  const [pending, setPending] = React.useState(false)

  async function save() {
    const next = {
      applyTolerance: apply,
      lateGraceMinutes: Number(late) || 0,
      lunchGraceMinutes: Number(lunch) || 0,
      earlyLeaveGraceMinutes: Number(early) || 0,
      defaultBreakMinutes: Number(breakDefault) || 0,
    }

    const patch = diffFields(baseline, next, {
      lateGraceMinutes: sameTolerance,
      lunchGraceMinutes: sameTolerance,
      earlyLeaveGraceMinutes: sameTolerance,
      defaultBreakMinutes: sameTolerance,
    })

    if (isEmptyPatch(patch)) {
      toast.info("Sin cambios")
      return
    }

    setPending(true)
    const result = await updateAttendanceSettings(patch)

    if (result.ok) {
      setBaseline(next)
      if (result.data) onSaved(result.data)
      toast.success("Tolerancias actualizadas")
    } else {
      toast.error(result.message ?? "No pudimos guardar las tolerancias")
    }
    setPending(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reglas de tolerancia</CardTitle>
        <CardDescription>
          Se aplican al registrar checadas. Si están apagadas, se guarda la hora
          exacta.
        </CardDescription>
        <div className="flex items-center gap-2">
          <Switch
            checked={apply}
            onCheckedChange={setApply}
            disabled={!canManage}
            id="apply-tolerance"
          />
          <label htmlFor="apply-tolerance" className="text-sm">
            Aplicar tolerancias
          </label>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field>
          <FieldLabel htmlFor="late-grace">Entrada (min)</FieldLabel>
          <Input
            id="late-grace"
            type="number"
            min="0"
            max="120"
            value={late}
            disabled={!canManage}
            onChange={(event) => setLate(event.target.value)}
          />
          <FieldDescription>Minutos de retardo que no cuentan.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="lunch-grace">Comida (min)</FieldLabel>
          <Input
            id="lunch-grace"
            type="number"
            min="0"
            max="120"
            value={lunch}
            disabled={!canManage}
            onChange={(event) => setLunch(event.target.value)}
          />
          <FieldDescription>Exceso de comida tolerado.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="early-grace">Salida (min)</FieldLabel>
          <Input
            id="early-grace"
            type="number"
            min="0"
            max="120"
            value={early}
            disabled={!canManage}
            onChange={(event) => setEarly(event.target.value)}
          />
          <FieldDescription>Salida anticipada tolerada.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="default-break">Comida por defecto</FieldLabel>
          <Input
            id="default-break"
            type="number"
            min="0"
            max="240"
            value={breakDefault}
            disabled={!canManage}
            onChange={(event) => setBreakDefault(event.target.value)}
          />
          <FieldDescription>Si el turno no define otra.</FieldDescription>
        </Field>

        {canManage ? (
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="button" onClick={() => void save()} disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
              Guardar tolerancias
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function KioskOperatorsDialog({
  open,
  onOpenChange,
  employees,
  initial,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: ScheduleEmployee[]
  initial: string[]
  onSaved: (userIds: string[]) => void
}) {
  const [selected, setSelected] = React.useState<string[]>(initial)
  const [pending, setPending] = React.useState(false)

  async function save() {
    setPending(true)
    const result = await setKioskOperators(selected)

    if (result.ok) {
      onSaved(result.data?.userIds ?? selected)
      toast.success("Cuentas del checador actualizadas")
      onOpenChange(false)
    } else {
      toast.error(result.message ?? "No pudimos actualizar las cuentas")
    }
    setPending(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cuentas del checador</DialogTitle>
          <DialogDescription>
            Estas cuentas podrán abrir el Checador y registrar la entrada/salida
            de las personas asignadas hoy, con su PIN.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {employees.map((employee) => (
            <label
              key={employee.id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={selected.includes(employee.id)}
                onChange={(event) =>
                  setSelected((current) =>
                    event.target.checked
                      ? [...current, employee.id]
                      : current.filter((id) => id !== employee.id),
                  )
                }
                className="size-4 accent-primary"
              />
              <span>{employee.name ?? employee.username}</span>
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={() => void save()} disabled={pending}>
            {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
