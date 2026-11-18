"use server"

import { mutateApi, type ActionResult } from "@/lib/server-api"
import type { FiscalProfile } from "@/lib/fiscal"

export interface FiscalProfileInput {
  rfc: string
  legalName: string
  taxRegime: string
  zipCode: string
  cfdiUse?: string
  email?: string
}

export async function saveFiscalProfile(
  input: FiscalProfileInput
): Promise<ActionResult<FiscalProfile>> {
  return mutateApi<FiscalProfile>("/fiscal/profile", "PUT", input, [
    "/settings",
  ])
}
