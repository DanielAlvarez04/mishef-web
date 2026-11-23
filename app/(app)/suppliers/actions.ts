"use server"

import { mutateApi, readApi, type ActionResult } from "@/lib/server-api"
import type { UnitCode } from "@/lib/catalog"
import type { Supplier, SupplierProduct } from "@/lib/purchases"

export interface SupplierInput {
  name: string
  rfc?: string | null
  aliases?: string[]
  defaultTaxRate?: number | null
}

export interface SupplierProductInput {
  rawName: string
  ingredientId?: string | null
  quantity: number
  unit: UnitCode
  lastUnitCostGross?: number
}

export async function createSupplier(
  input: SupplierInput
): Promise<ActionResult<Supplier>> {
  return mutateApi("/suppliers", "POST", input, ["/suppliers", "/purchases"])
}

export async function updateSupplier(
  id: string,
  input: Partial<SupplierInput> & { isActive?: boolean }
): Promise<ActionResult<Supplier>> {
  return mutateApi(`/suppliers/${id}`, "PATCH", input, [
    "/suppliers",
    "/purchases",
  ])
}

export async function deactivateSupplier(
  id: string
): Promise<ActionResult<Supplier>> {
  return mutateApi(`/suppliers/${id}`, "DELETE", undefined, [
    "/suppliers",
    "/purchases",
  ])
}

/** Mapeos de productos del proveedor (se leen al abrir el diálogo). */
export async function getSupplierProducts(
  supplierId: string
): Promise<ActionResult<SupplierProduct[]>> {
  return readApi(`/suppliers/${supplierId}/products`)
}

export async function createSupplierProduct(
  supplierId: string,
  input: SupplierProductInput
): Promise<ActionResult<SupplierProduct>> {
  return mutateApi(`/suppliers/${supplierId}/products`, "POST", input, [
    "/suppliers",
  ])
}

export async function deleteSupplierProduct(
  supplierId: string,
  productId: string
): Promise<ActionResult<{ deleted: boolean }>> {
  return mutateApi(
    `/suppliers/${supplierId}/products/${productId}`,
    "DELETE",
    undefined,
    ["/suppliers"]
  )
}
