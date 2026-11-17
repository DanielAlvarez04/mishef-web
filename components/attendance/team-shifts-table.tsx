import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ShiftAdminActions } from "@/components/attendance/shift-admin-actions"
import {
  clockTime,
  formatMinutes,
  type ShiftList,
} from "@/lib/attendance"

function dayLabel(value: string): string {
  return new Date(value).toLocaleDateString("es-MX", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  })
}

function breakMinutesOf(shift: ShiftList["shifts"][number]): string {
  const breaks = shift.breaks ?? []

  if (breaks.length === 0) return "—"
  if (breaks.some((row) => !row.endedAt)) return "en curso"

  const minutes = breaks.reduce(
    (sum, row) => sum + (row.effectiveMinutes ?? 0),
    0,
  )

  return formatMinutes(minutes)
}

function adjustmentMinutesOf(shift: ShiftList["shifts"][number]): string {
  const minutes = (shift.adjustments ?? []).reduce(
    (sum, row) => sum + row.minutes,
    0,
  )

  return minutes > 0 ? `+${formatMinutes(minutes)}` : "—"
}

/** Registros reales del equipo en la semana, con acciones de ADMIN. */
export function TeamShiftsTable({
  list,
  rangeLabel,
  canManage,
}: {
  list: ShiftList
  rangeLabel: string
  canManage: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registros de la semana</CardTitle>
        <CardDescription>
          {rangeLabel} · {list.shifts.length} turno(s) ·{" "}
          {list.hours.toFixed(1)} h trabajadas
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Persona</th>
                <th className="px-4 py-2 font-medium">Horario</th>
                <th className="px-4 py-2 font-medium">Entrada</th>
                <th className="px-4 py-2 font-medium">Salida</th>
                <th className="px-4 py-2 font-medium">Comida</th>
                <th className="px-4 py-2 font-medium">Extras</th>
                <th className="px-4 py-2 text-right font-medium">Horas</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                {canManage ? (
                  <th className="px-4 py-2 text-right font-medium">Acciones</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {list.shifts.map((shift) => (
                <tr key={shift.id} className="border-t align-top">
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {shift.user?.name ?? shift.user?.username ?? "—"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {dayLabel(shift.startedAt)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {shift.scheduledStartedAt && shift.scheduledEndedAt
                      ? `${clockTime(shift.scheduledStartedAt)}–${clockTime(
                          shift.scheduledEndedAt,
                        )}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2 tabular-nums">
                    {clockTime(shift.startedAt)}
                  </td>
                  <td className="px-4 py-2 tabular-nums">
                    {shift.endedAt ? (
                      clockTime(shift.endedAt)
                    ) : (
                      <Badge variant="outline">en curso</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {breakMinutesOf(shift)}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {adjustmentMinutesOf(shift)}
                  </td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums">
                    {formatMinutes(shift.workedMinutes ?? 0)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {shift.needsReview ? (
                        <Badge variant="outline">Por autorizar</Badge>
                      ) : null}
                      {shift.withinGeofence === false ? (
                        <Badge variant="outline">Fuera de zona</Badge>
                      ) : null}
                      {shift.source === "KIOSK" ? (
                        <Badge variant="secondary">Checador</Badge>
                      ) : null}
                      {!shift.needsReview &&
                      shift.source !== "KIOSK" &&
                      shift.withinGeofence !== false ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : null}
                    </div>
                  </td>
                  {canManage ? (
                    <td className="px-4 py-2">
                      <ShiftAdminActions shift={shift} />
                    </td>
                  ) : null}
                </tr>
              ))}
              {list.shifts.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 9 : 8}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No hay checadas registradas en esta semana.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
