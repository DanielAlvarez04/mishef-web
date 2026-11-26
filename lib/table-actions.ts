"use server"

import { mutateApi, readApi, type ActionResult } from "@/lib/server-api"
import type { DiningTable } from "@/lib/tables"

const PATHS = ["/settings", "/pos"]

export interface DiningTableInput {
  number?: string
  zone?: string | null
  seats?: number
  sortOrder?: number
  isActive?: boolean
}

export async function getDiningTables(): Promise<ActionResult<DiningTable[]>> {
  return readApi<DiningTable[]>("/tables")
}

export async function createDiningTable(
  input: DiningTableInput & { number: string }
): Promise<ActionResult<DiningTable>> {
  return mutateApi<DiningTable>("/tables", "POST", input, PATHS)
}

export async function updateDiningTable(
  id: string,
  input: DiningTableInput
): Promise<ActionResult<DiningTable>> {
  return mutateApi<DiningTable>(`/tables/${id}`, "PATCH", input, PATHS)
}

export async function deleteDiningTable(
  id: string
): Promise<ActionResult<unknown>> {
  return mutateApi(`/tables/${id}`, "DELETE", undefined, PATHS)
}
