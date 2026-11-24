"use server"

import { mutateApi, type ActionResult } from "@/lib/server-api"
import type {
  ReceiptPreviewResult,
  ReceiptTemplate,
  ReceiptTestResult,
} from "@/lib/receipts"

const PATHS = ["/platform/receipts"]

export async function saveReceiptTemplate(
  branchId: string,
  template: ReceiptTemplate | null
): Promise<ActionResult<{ template: ReceiptTemplate }>> {
  if (!branchId) {
    return { ok: false, message: "Sucursal no encontrada." }
  }

  return mutateApi<{ template: ReceiptTemplate }>(
    `/platform/branches/${branchId}/receipt-template`,
    "PATCH",
    { template },
    PATHS
  )
}

export async function previewReceiptTemplate(
  branchId: string,
  template: ReceiptTemplate
): Promise<ActionResult<ReceiptPreviewResult>> {
  if (!branchId) {
    return { ok: false, message: "Sucursal no encontrada." }
  }

  return mutateApi<ReceiptPreviewResult>(
    `/platform/branches/${branchId}/receipt-preview`,
    "POST",
    { template }
  )
}

export async function testPrintReceipt(
  branchId: string,
  template: ReceiptTemplate
): Promise<ActionResult<ReceiptTestResult>> {
  if (!branchId) {
    return { ok: false, message: "Sucursal no encontrada." }
  }

  return mutateApi<ReceiptTestResult>(
    `/platform/branches/${branchId}/receipt-test`,
    "POST",
    { template }
  )
}
