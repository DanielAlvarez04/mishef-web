"use server"

import { mutateApi, type ActionResult } from "@/lib/server-api"

const PATHS = ["/platform/features"]

export async function saveOrganizationFeatures(
  organizationId: string,
  overrides: Record<string, boolean>
): Promise<ActionResult<Record<string, boolean>>> {
  if (!organizationId) {
    return { ok: false, message: "Organización no encontrada" }
  }

  return mutateApi<Record<string, boolean>>(
    `/platform/organizations/${organizationId}/features`,
    "PATCH",
    { overrides },
    PATHS
  )
}
