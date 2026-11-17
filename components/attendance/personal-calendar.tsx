import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  clockTime,
  formatMinutes,
  type PersonalScheduleEntry,
  type ShiftRow,
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

/** Calendario personal de dos semanas: horario publicado + checadas reales. */
export function PersonalCalendar({
  weekStart,
  schedule,
  shifts,
}: {
  weekStart: string
  schedule: PersonalScheduleEntry[]
  shifts: ShiftRow[]
}) {
  const start = new Date(`${weekStart}T00:00:00`)
  const scheduleByDate = new Map(schedule.map((entry) => [entry.date.slice(0, 10), entry]))
  const shiftByDate = new Map(
    shifts.map((shift) => [dateKey(new Date(shift.startedAt)), shift]),
  )
  const today = dateKey(new Date())

  const weeks = [0, 1].map((offset) => {
    const days = Array.from({ length: 7 }, (_, index) =>
      addDays(start, offset * 7 + index),
    )

    return (
      <div key={offset} className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {offset === 0 ? "Esta semana" : "Próxima semana"}
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {days.map((day) => {
            const key = dateKey(day)
            const planned = scheduleByDate.get(key)
            const actual = shiftByDate.get(key)
            const isToday = key === today

            return (
              <div
                key={key}
                className={`flex min-h-28 flex-col gap-1 rounded-lg border p-3 text-sm ${
                  isToday ? "border-primary/60 bg-primary/5" : ""
                }`}
              >
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  {day.toLocaleDateString("es-MX", {
                    weekday: "short",
                    day: "2-digit",
                  })}
                </span>

                {planned ? (
                  <span className="font-medium">
                    {planned.startTime}–{planned.endTime}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Sin turno</span>
                )}

                {actual ? (
                  <span className="text-xs text-muted-foreground">
                    {clockTime(actual.startedAt)}–{clockTime(actual.endedAt)}
                    {actual.workedMinutes !== undefined
                      ? ` · ${formatMinutes(actual.workedMinutes)}`
                      : ""}
                  </span>
                ) : null}

                <div className="mt-auto flex flex-wrap gap-1">
                  {isToday ? <Badge variant="secondary">Hoy</Badge> : null}
                  {actual?.needsReview ? (
                    <Badge variant="outline">Por autorizar</Badge>
                  ) : null}
                  {planned && !actual && key < today ? (
                    <Badge variant="outline">Sin checada</Badge>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mi calendario</CardTitle>
        <CardDescription>
          Horario publicado y horas reales de las próximas dos semanas.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">{weeks}</CardContent>
    </Card>
  )
}
