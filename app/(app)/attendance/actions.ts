"use server"

import { mutateApi, type ActionResult } from "@/lib/server-api"
import type { ShiftRow } from "@/lib/attendance"

export async function clockIn(note?: string): Promise<ActionResult<ShiftRow>> {
  return mutateApi<ShiftRow>(
    "/attendance/clock-in",
    "POST",
    { note: note?.trim() || undefined },
    ["/attendance", "/dashboard"]
  )
}

export async function clockOut(): Promise<ActionResult<ShiftRow>> {
  return mutateApi<ShiftRow>("/attendance/clock-out", "POST", undefined, [
    "/attendance",
    "/dashboard",
  ])
}
