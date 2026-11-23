"use server"

import { mutateApi, type ActionResult } from "@/lib/server-api"
import type { AnomalyReviewStatus } from "@/lib/anomalies"

/** Reconoce o descarta una anomalía para que el equipo sepa que ya la revisó. */
export async function reviewAnomaly(
  key: string,
  status: AnomalyReviewStatus
): Promise<ActionResult<unknown>> {
  return mutateApi(
    `/intel/anomalies/${encodeURIComponent(key)}/review`,
    "POST",
    { status },
    ["/intel/anomalies"]
  )
}
