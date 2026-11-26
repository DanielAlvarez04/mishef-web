"use server"

import { mutateApi, type ActionResult } from "@/lib/server-api"
import type {
  KitchenConfig,
  KitchenMode,
  KitchenPositionLevel,
  KitchenStationType,
} from "@/lib/kitchen-config"

const PATHS = ["/settings"]

export function saveKitchenMode(
  mode: KitchenMode
): Promise<ActionResult<{ mode: KitchenMode; branchId: string }>> {
  return mutateApi("/kitchen/mode", "PATCH", { mode }, PATHS)
}

export function seedKitchenPositions(): Promise<ActionResult<unknown>> {
  return mutateApi("/kitchen/positions/presets", "POST", undefined, PATHS)
}

export interface KitchenStationInput {
  name: string
  code?: string
  type?: KitchenStationType
  color?: string | null
  sortOrder?: number
  isActive?: boolean
}

export function createKitchenStation(
  input: KitchenStationInput
): Promise<ActionResult<unknown>> {
  return mutateApi("/kitchen/stations", "POST", input, PATHS)
}

export function updateKitchenStation(
  id: string,
  input: KitchenStationInput
): Promise<ActionResult<unknown>> {
  return mutateApi(`/kitchen/stations/${id}`, "PATCH", input, PATHS)
}

export function deactivateKitchenStation(
  id: string
): Promise<ActionResult<unknown>> {
  return mutateApi(`/kitchen/stations/${id}`, "DELETE", undefined, PATHS)
}

export interface KitchenPositionInput {
  name: string
  code?: string
  level?: KitchenPositionLevel
  permissions?: string[]
  isActive?: boolean
}

export function createKitchenPosition(
  input: KitchenPositionInput
): Promise<ActionResult<unknown>> {
  return mutateApi("/kitchen/positions", "POST", input, PATHS)
}

export function updateKitchenPosition(
  id: string,
  input: KitchenPositionInput
): Promise<ActionResult<unknown>> {
  return mutateApi(`/kitchen/positions/${id}`, "PATCH", input, PATHS)
}

export function deactivateKitchenPosition(
  id: string
): Promise<ActionResult<unknown>> {
  return mutateApi(`/kitchen/positions/${id}`, "DELETE", undefined, PATHS)
}

export interface KitchenAssignmentInput {
  kitchenPositionId: string | null
  stationIds: string[]
}

export function saveKitchenAssignment(
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

export function createKitchenRouting(
  input: KitchenRoutingInput
): Promise<ActionResult<unknown>> {
  return mutateApi("/kitchen/routing", "POST", input, PATHS)
}

export function updateKitchenRouting(
  id: string,
  input: KitchenRoutingInput
): Promise<ActionResult<unknown>> {
  return mutateApi(`/kitchen/routing/${id}`, "PATCH", input, PATHS)
}

export function deleteKitchenRouting(
  id: string
): Promise<ActionResult<unknown>> {
  return mutateApi(`/kitchen/routing/${id}`, "DELETE", undefined, PATHS)
}
