"use server"

import { mutateApi, type ActionResult } from "@/lib/server-api"
import type { WasteReasonCode } from "@/lib/waste"

export interface WasteInput {
  ingredientId: string
  quantity: string
  reason: WasteReasonCode
  note?: string
  photoKey?: string
}

export async function createWaste(
  input: WasteInput
): Promise<ActionResult<{ id: string; cost: string }>> {
  return mutateApi("/waste", "POST", input, ["/waste", "/reports/food-cost"])
}

export async function presignWastePhoto(
  contentType: string
): Promise<ActionResult<{ key: string; uploadUrl: string; publicUrl: string }>> {
  return mutateApi("/waste/photo", "POST", { contentType }, [])
}
