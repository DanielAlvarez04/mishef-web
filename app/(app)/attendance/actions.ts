"use server"

import { mutateApi, readApi, type ActionResult } from "@/lib/server-api"
import type {
  AttendanceSettings,
  KioskData,
  PunchAction,
  ShiftBreakType,
  ShiftRow,
  WeekSchedule,
} from "@/lib/attendance"

const ATTENDANCE_PATHS = ["/attendance", "/dashboard"]

interface Coordinates {
  latitude?: number
  longitude?: number
}

export async function clockIn(
  note?: string,
  coords: Coordinates = {}
): Promise<ActionResult<ShiftRow>> {
  return mutateApi<ShiftRow>(
    "/attendance/clock-in",
    "POST",
    { note: note?.trim() || undefined, ...coords },
    ATTENDANCE_PATHS
  )
}

export async function clockOut(
  note?: string,
  coords: Coordinates = {}
): Promise<ActionResult<ShiftRow>> {
  return mutateApi<ShiftRow>(
    "/attendance/clock-out",
    "POST",
    { note: note?.trim() || undefined, ...coords },
    ATTENDANCE_PATHS
  )
}

export async function startBreak(
  type: ShiftBreakType,
  note?: string,
  coords: Coordinates = {}
): Promise<ActionResult<ShiftRow>> {
  return mutateApi<ShiftRow>(
    "/attendance/breaks/start",
    "POST",
    { type, note: note?.trim() || undefined, ...coords },
    ATTENDANCE_PATHS
  )
}

export async function endBreak(
  note?: string,
  coords: Coordinates = {}
): Promise<ActionResult<ShiftRow>> {
  return mutateApi<ShiftRow>(
    "/attendance/breaks/end",
    "POST",
    { note: note?.trim() || undefined, ...coords },
    ATTENDANCE_PATHS
  )
}

export async function getKiosk(): Promise<ActionResult<KioskData>> {
  return readApi<KioskData>("/attendance/kiosk")
}

export async function getSchedule(
  weekStart: string
): Promise<ActionResult<WeekSchedule>> {
  return readApi<WeekSchedule>(
    `/attendance/schedule?weekStart=${encodeURIComponent(weekStart)}`
  )
}

export async function getShiftEvents(
  shiftId: string
): Promise<
  ActionResult<
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
  >
> {
  return readApi(`/attendance/${shiftId}/events`)
}

export async function kioskPunch(input: {
  userId: string
  pin: string
  action: PunchAction
  note?: string
  latitude?: number
  longitude?: number
  idempotencyKey?: string
}): Promise<ActionResult<{ ok: boolean; employee: { id: string; name: string | null } }>> {
  return mutateApi(
    "/attendance/kiosk/punch",
    "POST",
    input,
    ATTENDANCE_PATHS
  )
}

export async function updateAttendanceSettings(
  input: Partial<{
    applyTolerance: boolean
    lateGraceMinutes: number
    lunchGraceMinutes: number
    earlyLeaveGraceMinutes: number
    defaultBreakMinutes: number
  }>
): Promise<ActionResult<AttendanceSettings>> {
  return mutateApi<AttendanceSettings>(
    "/attendance/settings",
    "PATCH",
    input,
    ATTENDANCE_PATHS
  )
}

export async function saveSchedule(input: {
  weekStart: string
  branchId?: string | null
  entries: Array<{
    userId: string
    date: string
    startTime: string
    endTime: string
    breakMinutes?: number
    note?: string
  }>
}): Promise<ActionResult<WeekSchedule>> {
  return mutateApi<WeekSchedule>(
    "/attendance/schedule",
    "PUT",
    input,
    ATTENDANCE_PATHS
  )
}

export async function publishSchedule(input: {
  weekStart: string
  branchId?: string | null
}): Promise<ActionResult<WeekSchedule>> {
  return mutateApi<WeekSchedule>(
    "/attendance/schedule/publish",
    "POST",
    input,
    ATTENDANCE_PATHS
  )
}

export async function copySchedule(input: {
  fromWeekStart: string
  weekStart: string
  branchId?: string | null
}): Promise<ActionResult<WeekSchedule>> {
  return mutateApi<WeekSchedule>(
    "/attendance/schedule/copy",
    "POST",
    input,
    ATTENDANCE_PATHS
  )
}

export async function setKioskOperators(
  userIds: string[]
): Promise<ActionResult<{ userIds: string[] }>> {
  return mutateApi<{ userIds: string[] }>(
    "/attendance/kiosk-operators",
    "PUT",
    { userIds },
    ATTENDANCE_PATHS
  )
}

export async function adjustShift(
  shiftId: string,
  input: { minutes: number; reason: string }
): Promise<ActionResult> {
  return mutateApi(
    `/attendance/${shiftId}/adjustments`,
    "POST",
    input,
    ATTENDANCE_PATHS
  )
}

export async function squareShift(shiftId: string): Promise<ActionResult> {
  return mutateApi(
    `/attendance/${shiftId}/square`,
    "POST",
    undefined,
    ATTENDANCE_PATHS
  )
}

export async function reviewShift(
  shiftId: string,
  approve: boolean,
  note?: string
): Promise<ActionResult> {
  return mutateApi(
    `/attendance/${shiftId}/review`,
    "POST",
    { approve, note: note?.trim() || undefined },
    ATTENDANCE_PATHS
  )
}
