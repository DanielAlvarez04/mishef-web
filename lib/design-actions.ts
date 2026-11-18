"use server"

import { mutateApi, type ActionResult } from "@/lib/server-api"
import type { DesignTokens } from "@/lib/design"

const PATHS = ["/styles", "/dashboard", "/platform"]

export async function saveDesignDraft(
  tokens: DesignTokens
): Promise<ActionResult> {
  return mutateApi("/design/draft", "PUT", { tokens }, PATHS)
}

export async function applyDesignTokens(
  tokens: DesignTokens
): Promise<ActionResult> {
  return mutateApi("/design/apply", "POST", { tokens }, PATHS)
}

export async function resetDesignTokens(): Promise<ActionResult> {
  return mutateApi("/design", "DELETE", undefined, PATHS)
}
