"use server"

import { mutateApi, type ActionResult } from "@/lib/server-api"
import type { DesignTokens } from "@/lib/design"

export async function saveDesignTokens(
  tokens: DesignTokens
): Promise<ActionResult<{ tokens: DesignTokens }>> {
  return mutateApi("/design", "PUT", { tokens }, [
    "/styles",
    "/dashboard",
    "/platform",
  ])
}

export async function resetDesignTokens(): Promise<ActionResult> {
  return mutateApi("/design", "DELETE", undefined, [
    "/styles",
    "/dashboard",
    "/platform",
  ])
}
