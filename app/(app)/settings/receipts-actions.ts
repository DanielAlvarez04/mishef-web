"use server"

import { mutateApi, type ActionResult } from "@/lib/server-api"
import type {
  ReceiptPreviewResult,
  ReceiptTemplate,
  ReceiptTestResult,
} from "@/lib/receipts"

const PATHS = ["/settings"]

export async function saveOrganizationReceiptTemplate(
  branchId: string,
  template: ReceiptTemplate | null
): Promise<ActionResult<{ template: ReceiptTemplate }>> {
  if (!branchId) {
    return { ok: false, message: "Sucursal no encontrada." }
  }

  return mutateApi<{ template: ReceiptTemplate }>(
    `/receipts/branches/${branchId}/receipt-template`,
    "PATCH",
    { template },
    PATHS
  )
}

export async function previewOrganizationReceiptTemplate(
  branchId: string,
  template: ReceiptTemplate
): Promise<ActionResult<ReceiptPreviewResult>> {
  if (!branchId) {
    return { ok: false, message: "Sucursal no encontrada." }
  }

  return mutateApi<ReceiptPreviewResult>(
    `/receipts/branches/${branchId}/receipt-preview`,
    "POST",
    { template }
  )
}

export async function testPrintOrganizationReceipt(
  branchId: string,
  template: ReceiptTemplate
): Promise<ActionResult<ReceiptTestResult>> {
  if (!branchId) {
    return { ok: false, message: "Sucursal no encontrada." }
  }

  return mutateApi<ReceiptTestResult>(
    `/receipts/branches/${branchId}/receipt-test`,
    "POST",
    { template }
  )
}
