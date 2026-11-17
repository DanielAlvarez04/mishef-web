/** Ver turnos del equipo y el reparto completo: ADMIN y CASHIER. */
export function canReadTeamAttendance(roles: string[]): boolean {
  return roles.some((role) => ["ADMIN", "CASHIER"].includes(role))
}

export type ShiftSource = "WEB" | "KIOSK" | "ADMIN" | "OFFLINE"
export type ShiftBreakType = "LUNCH" | "REST" | "OTHER"
export type PunchAction = "CLOCK_IN" | "LUNCH_START" | "LUNCH_END" | "CLOCK_OUT"

export interface ShiftBreakRow {
  id: string
  type: ShiftBreakType
  startedAt: string
  endedAt: string | null
  effectiveMinutes: number | null
  note: string | null
}

export interface ShiftAdjustmentRow {
  id: string
  minutes: number
  reason: string
  createdAt: string
  createdBy?: { id: string; name: string | null; username: string | null } | null
}

export interface ShiftRow {
  id: string
  startedAt: string
  endedAt: string | null
  effectiveStartedAt: string | null
  effectiveEndedAt: string | null
  scheduledStartedAt: string | null
  scheduledEndedAt: string | null
  note: string | null
  branchId: string | null
  source: ShiftSource
  withinGeofence: boolean | null
  needsReview: boolean
  reviewedAt: string | null
  workedMinutes?: number
  breaks?: ShiftBreakRow[]
  adjustments?: ShiftAdjustmentRow[]
  user?: { id: string; name: string | null; username: string | null }
}

export interface ShiftList {
  shifts: ShiftRow[]
  hours: number
}

export interface AttendanceSettings {
  attendanceApplyTolerance: boolean
  attendanceLateGraceMinutes: number
  attendanceLunchGraceMinutes: number
  attendanceEarlyLeaveGraceMinutes: number
  attendanceDefaultBreakMinutes: number
}

export interface ScheduleEntryRow {
  id: string
  userId: string
  date: string
  startTime: string
  endTime: string
  breakMinutes: number
  note: string | null
}

export interface ScheduleEmployee {
  id: string
  name: string | null
  username: string | null
  roles: string[]
  kioskEnabled: boolean
}

export interface ShiftTemplateRow {
  id: string
  name: string
  startTime: string
  endTime: string
  breakMinutes: number
  color: string | null
  isActive: boolean
}

export interface WeekSchedule {
  weekStart: string
  branchId: string | null
  status: "DRAFT" | "PUBLISHED"
  publishedAt: string | null
  entries: ScheduleEntryRow[]
  employees: ScheduleEmployee[]
  templates: ShiftTemplateRow[]
  settings: AttendanceSettings
  kioskOperators: string[]
}

export interface TipShare {
  userId: string
  name: string | null
  role: string
  hours: number
  weight: number
  share: number
}

export interface TipDistribution {
  from: string
  to: string
  pool: number
  totalWeight?: number
  participants: TipShare[]
}

export interface MyTips {
  pool: number
  totalWeight: number
  participant: TipShare | null
}

export interface PersonalScheduleEntry {
  id: string
  userId: string
  date: string
  startTime: string
  endTime: string
  breakMinutes: number
  note: string | null
}

export interface PersonalAttendance {
  current: ShiftRow | null
  shifts: ShiftRow[]
  schedule: PersonalScheduleEntry[]
  settings: AttendanceSettings | null
  tips: MyTips | null
  kioskEnabled: boolean
}

export interface KioskEmployee {
  id: string
  name: string | null
  username: string | null
  roles: string[]
  scheduledStart: string
  scheduledEnd: string
  breakMinutes: number
  hasPin: boolean
  pinLocked: boolean
  status: "OFF" | "WORKING" | "ON_BREAK" | "DONE"
  shiftId: string | null
}

export interface KioskData {
  date: string
  branchId: string | null
  settings: AttendanceSettings
  employees: KioskEmployee[]
}

/** Duración legible de un turno: `7h 25m`. Si sigue abierto, calcula el tiempo
 * transcurrido hasta ahora; la tabla lo acompaña con la etiqueta "en curso". */
export function shiftDuration(start: string, end: string | null): string {
  const endMs = end ? new Date(end).getTime() : Date.now()
  const minutes = Math.max(
    0,
    Math.round((endMs - new Date(start).getTime()) / 60000)
  )

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`
}

/** Minutos como `7h 25m` (sin depender de una fecha de fin). */
export function formatMinutes(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes))
  const hours = Math.floor(safe / 60)
  const rest = safe % 60

  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`
}

/** Hora `HH:mm` de un ISO. */
export function clockTime(value: string | null): string {
  if (!value) return "—"

  return new Date(value).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  })
}
