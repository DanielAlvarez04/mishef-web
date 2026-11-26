"use server"

import { mutateApi, type ActionResult } from "@/lib/server-api"
import type {
  KitchenConfig,
  KitchenMode,
  KitchenPositionLevel,
} from "@/lib/kitchen-config"

const PATHS = ["/settings"]

export async function saveKitchenMode(
  mode: KitchenMode
): Promise<ActionResult<{ mode: KitchenMode; branchId: string }>> {
  return mutateApi("/kitchen/mode", "PATCH", { mode }, PATHS)
}

export async function seedKitchenPositions(): Promise<ActionResult<unknown>> {
  return mutateApi("/kitchen/positions/presets", "POST", undefined, PATHS)
}

export interface KitchenStationInput {
  name?: string
  code?: string
  color?: string | null
  sortOrder?: number
  /** Minutos objetivo de preparación; `null` = usa el estimado de la ronda. */
  slaMinutes?: number | null
  isActive?: boolean
}

export async function createKitchenStation(
  input: KitchenStationInput & { name: string }
): Promise<ActionResult<unknown>> {
  return mutateApi("/kitchen/stations", "POST", input, PATHS)
}

export async function updateKitchenStation(
  id: string,
  input: KitchenStationInput
): Promise<ActionResult<unknown>> {
  return mutateApi(`/kitchen/stations/${id}`, "PATCH", input, PATHS)
}

export async function deactivateKitchenStation(
  id: string
): Promise<ActionResult<unknown>> {
  return mutateApi(`/kitchen/stations/${id}`, "DELETE", undefined, PATHS)
}

export interface KitchenPositionInput {
  name?: string
  code?: string
  level?: KitchenPositionLevel
  permissions?: string[]
  isActive?: boolean
}

export async function createKitchenPosition(
  input: KitchenPositionInput & { name: string }
): Promise<ActionResult<unknown>> {
  return mutateApi("/kitchen/positions", "POST", input, PATHS)
}

export async function updateKitchenPosition(
  id: string,
  input: KitchenPositionInput
): Promise<ActionResult<unknown>> {
  return mutateApi(`/kitchen/positions/${id}`, "PATCH", input, PATHS)
}

export async function deactivateKitchenPosition(
  id: string
): Promise<ActionResult<unknown>> {
  return mutateApi(`/kitchen/positions/${id}`, "DELETE", undefined, PATHS)
}

export interface KitchenAssignmentInput {
  kitchenPositionId: string | null
  stationIds: string[]
}

export async function saveKitchenAssignment(
  membershipId: string,
  input: KitchenAssignmentInput
): Promise<ActionResult<KitchenConfig>> {
  return mutateApi(`/kitchen/assignments/${membershipId}`, "PUT", input, PATHS)
}

export interface KitchenRoutingInput {
  stationId: string
  itemId?: string | null
  categoryId?: string | null
  menuId?: string | null
  priority?: number
}

export async function createKitchenRouting(
  input: KitchenRoutingInput
): Promise<ActionResult<unknown>> {
  return mutateApi("/kitchen/routing", "POST", input, PATHS)
}

export async function updateKitchenRouting(
  id: string,
  input: KitchenRoutingInput
): Promise<ActionResult<unknown>> {
  return mutateApi(`/kitchen/routing/${id}`, "PATCH", input, PATHS)
}

export async function deleteKitchenRouting(
  id: string
): Promise<ActionResult<unknown>> {
  return mutateApi(`/kitchen/routing/${id}`, "DELETE", undefined, PATHS)
}

export interface KitchenCourseInput {
  name: string
  sortOrder?: number
  isActive?: boolean
}

export async function createKitchenCourse(
  input: KitchenCourseInput
): Promise<ActionResult<unknown>> {
  return mutateApi("/kitchen/courses", "POST", input, PATHS)
}

export async function updateKitchenCourse(
  id: string,
  input: KitchenCourseInput
): Promise<ActionResult<unknown>> {
  return mutateApi(`/kitchen/courses/${id}`, "PATCH", input, PATHS)
}

export async function deactivateKitchenCourse(
  id: string
): Promise<ActionResult<unknown>> {
  return mutateApi(`/kitchen/courses/${id}`, "DELETE", undefined, PATHS)
}
