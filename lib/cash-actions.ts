"use server"

import { mutateApi, readApi, type ActionResult } from "@/lib/server-api"
import type {
  CashMovement,
  CashMovementType,
  CashReconciliation,
  CashSessionPayload,
} from "@/lib/cash"

const CASH_PATHS = ["/pos", "/reports", "/dashboard"]

export async function openCashSession(
  openingFloat: number
): Promise<ActionResult<CashSessionPayload>> {
  return mutateApi<CashSessionPayload>(
    "/cash/sessions",
    "POST",
    { openingFloat },
    CASH_PATHS
  )
}

export async function closeCashSession(
  sessionId: string,
  input: { countedCash: number; notes?: string; idempotencyKey?: string }
): Promise<ActionResult<CashSessionPayload>> {
  return mutateApi<CashSessionPayload>(
    `/cash/sessions/${sessionId}/close`,
    "POST",
    input,
    CASH_PATHS
  )
}

export async function addCashMovement(
  sessionId: string,
  input: { type: CashMovementType; amount: number; reason: string }
): Promise<ActionResult<CashMovement>> {
  return mutateApi<CashMovement>(
    `/cash/sessions/${sessionId}/movements`,
    "POST",
    input,
    CASH_PATHS
  )
}

/** Conciliación del turno. Con `counted` calcula la diferencia sin cerrar. */
export async function getCashReconciliation(
  sessionId: string,
  counted?: number
): Promise<ActionResult<CashReconciliation>> {
  const query =
    counted !== undefined && Number.isFinite(counted)
      ? `?counted=${encodeURIComponent(String(counted))}`
      : ""

  return readApi<CashReconciliation>(
    `/cash/sessions/${sessionId}/reconciliation${query}`
  )
}
