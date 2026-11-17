import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AttendanceTabs } from "@/components/attendance/attendance-tabs"
import { AssignmentTabs } from "@/components/attendance/assignment-tabs"
import { ClockCard } from "@/components/attendance/clock-card"
import { PersonalCalendar } from "@/components/attendance/personal-calendar"
import { ScheduleBoard } from "@/components/attendance/schedule-board"
import { TeamShiftsTable } from "@/components/attendance/team-shifts-table"
import { TipsTable } from "@/components/attendance/tips-table"
import { apiFetch } from "@/lib/api"
import {
  canReadTeamAttendance,
  clockTime,
  formatMinutes,
  type MyTips,
  type PersonalAttendance,
  type PersonalScheduleEntry,
  type ShiftList,
  type ShiftRow,
  type TipDistribution,
  type WeekSchedule,
} from "@/lib/attendance"
import { isAdmin, requireUser } from "@/lib/session"

/**
 * Lee JSON solo si hay cuerpo.
 *
 * Nest responde 200 con cuerpo vacío para algunos `null` y la página no debe
 * romperse con "Unexpected end of JSON input".
 */
async function readJsonOrNull<T>(
  response: Response | null,
): Promise<T | null> {
  if (!response || !response.ok || response.status === 204) return null

  const text = await response.text()
  if (!text.trim()) return null

  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

function startOfWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = result.getDay()
  const diff = day === 0 ? -6 : 1 - day
  result.setDate(result.getDate() + diff)
  return result
}

function dateKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function weekdayLabel(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-MX", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  })
}

function rangeLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`)
  const end = addDays(start, 6)

  return `${start.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  })} – ${end.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`
}

function PersonalShiftsCard({ shifts }: { shifts: ShiftRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mis últimas checadas</CardTitle>
        <CardDescription>Turnos de los últimos 7 días.</CardDescription>
      </CardHeader>
      <CardContent>
        {shifts.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Todavía no tienes checadas registradas.
          </p>
        ) : (
          <div className="flex flex-col divide-y">
            {shifts.map((shift) => (
              <div
                key={shift.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
              >
                <div className="flex flex-col">
                  <span className="font-medium">
                    {weekdayLabel(dateKey(new Date(shift.startedAt)))}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {clockTime(shift.startedAt)}–{clockTime(shift.endedAt)}
                    {shift.endedAt
                      ? ` · ${formatMinutes(shift.workedMinutes ?? 0)}`
                      : " · en curso"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {shift.needsReview ? (
                    <Badge variant="outline">Por autorizar</Badge>
                  ) : null}
                  {shift.withinGeofence === false ? (
                    <Badge variant="outline">Fuera de zona</Badge>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PersonalTipsCard({ tips }: { tips: MyTips | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mis propinas</CardTitle>
        <CardDescription>
          Reparto del mes en curso según tus horas efectivas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {tips?.participant ? (
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-3xl font-semibold tabular-nums">
                ${tips.participant.share.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                {tips.participant.hours.toFixed(2)} h · peso{" "}
                {tips.participant.weight.toFixed(2)} de {tips.totalWeight}
              </p>
            </div>
            <p className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              Pozo total del negocio: ${tips.pool.toFixed(2)}. Tu parte se
              calcula con tus horas y el factor de tu rol.
            </p>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Aún no acumulas horas este mes, así que todavía no tienes una parte
            del reparto.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function MissingCard({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-6 text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  )
}

export default async function AttendancePage() {
  const user = await requireUser()

  // Server component: la semana depende del reloj del servidor.
  const today = new Date()
  const weekStartDate = startOfWeek(today)
  const weekStart = dateKey(weekStartDate)
  const weekEnd = dateKey(addDays(weekStartDate, 6))
  const todayKey = dateKey(today)

  const canReadTeam = canReadTeamAttendance(user.roles)
  const canManage = isAdmin(user)

  const [meResponse, scheduleResponse, listResponse, tipsResponse] =
    await Promise.all([
      apiFetch("/attendance/me"),
      canReadTeam
        ? apiFetch(`/attendance/schedule?weekStart=${weekStart}`)
        : null,
      canReadTeam
        ? apiFetch(`/attendance?from=${weekStart}&to=${weekEnd}`)
        : null,
      canReadTeam
        ? apiFetch(`/attendance/tips?from=${weekStart}&to=${weekEnd}`)
        : null,
    ])

  const me = await readJsonOrNull<PersonalAttendance>(meResponse)
  const schedule = await readJsonOrNull<WeekSchedule>(scheduleResponse)
  const list = await readJsonOrNull<ShiftList>(listResponse)
  const tips = await readJsonOrNull<TipDistribution>(tipsResponse)

  const todaySchedule: PersonalScheduleEntry | null =
    me?.schedule.find((entry) => entry.date.slice(0, 10) === todayKey) ?? null
  const todayShift =
    me?.shifts.find(
      (shift) => dateKey(new Date(shift.startedAt)) === todayKey,
    ) ?? null

  const personal = me ? (
    <div className="flex flex-col gap-4">
      <ClockCard
        current={me.current}
        todayShift={todayShift}
        todaySchedule={todaySchedule}
        settings={me.settings}
        kioskEnabled={me.kioskEnabled}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <PersonalShiftsCard shifts={me.shifts} />
        <PersonalTipsCard tips={me.tips} />
      </div>

      <PersonalCalendar
        weekStart={weekStart}
        schedule={me.schedule}
        shifts={me.shifts}
      />
    </div>
  ) : (
    <MissingCard message="No pudimos cargar tu resumen de asistencia. Recarga la página e inténtalo de nuevo." />
  )

  const period = rangeLabel(weekStart)

  const assignment = canReadTeam ? (
    <AssignmentTabs
      schedule={
        schedule ? (
          <ScheduleBoard initial={schedule} canManage={canManage} />
        ) : (
          <MissingCard message="No pudimos cargar el horario de la semana." />
        )
      }
      records={
        list ? (
          <TeamShiftsTable
            list={list}
            rangeLabel={period}
            canManage={canManage}
          />
        ) : (
          <MissingCard message="No pudimos cargar los registros de la semana." />
        )
      }
      tips={
        tips ? (
          <TipsTable distribution={tips} rangeLabel={period} />
        ) : (
          <MissingCard message="No pudimos cargar el reparto de propinas." />
        )
      }
    />
  ) : null

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Asistencia</h1>
        <p className="text-sm text-muted-foreground">
          Checador, horarios asignados y propinas por horas trabajadas.
        </p>
      </div>

      <AttendanceTabs personal={personal} assignment={assignment} />
    </div>
  )
}
