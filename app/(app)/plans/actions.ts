"use server"

import { mutateApi, readApi, type ActionResult } from "@/lib/server-api"
import type { Plan } from "@/lib/billing"

const PATHS = ["/plans", "/billing", "/subscriptions"]

export interface PlanInput {
  code: string
  name: string
  description?: string | null
  priceMonthly: number
  priceYearly: number
  currency?: string
  perBranch?: boolean
  trialDays?: number
  maxBranches?: number | null
  maxUsersPerBranch?: number | null
  maxImagesPerItem?: number
  maxVideosPerItem?: number
  maxStorageBytes?: number | null
  maxInventoryItems?: number | null
  customDomain?: boolean
  isActive?: boolean
  isPublic?: boolean
  sortOrder?: number
}

export async function getPlatformPlans(): Promise<ActionResult<Plan[]>> {
  return readApi<Plan[]>("/platform/plans")
}

export async function createPlatformPlan(
  input: PlanInput
): Promise<ActionResult<Plan>> {
  return mutateApi<Plan>("/platform/plans", "POST", input, PATHS)
}

export async function updatePlatformPlan(
  planId: string,
  input: Partial<PlanInput>
): Promise<ActionResult<Plan>> {
  return mutateApi<Plan>(`/platform/plans/${planId}`, "PATCH", input, PATHS)
}
