import type { UnitCode } from "@/lib/catalog"

export type PurchaseStatus =
  | "PROCESSING"
  | "NEEDS_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "FAILED"

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  PROCESSING: "Leyendo ticket",
  NEEDS_REVIEW: "Por revisar",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  FAILED: "No se pudo leer",
}

export type PurchaseStatusVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"

export function purchaseStatusLabel(status: string): string {
  return PURCHASE_STATUS_LABELS[status as PurchaseStatus] ?? status
}

export function purchaseStatusVariant(status: string): PurchaseStatusVariant {
  switch (status) {
    case "APPROVED":
      return "success"
    case "NEEDS_REVIEW":
      return "default"
    case "FAILED":
    case "REJECTED":
      return "destructive"
    default:
      return "secondary"
  }
}

/** ADMIN, SUPERVISOR e INVENTORY_MANAGER administran compras y proveedores. */
export function canManagePurchases(roles: readonly string[]): boolean {
  return (
    roles.includes("ADMIN") ||
    roles.includes("SUPERVISOR") ||
    roles.includes("INVENTORY_MANAGER")
  )
}

export interface Supplier {
  id: string
  name: string
  rfc: string | null
  aliases: string[]
  defaultTaxRate: string | null
  isActive: boolean
  createdAt: string
  _count?: { products: number; purchases: number }
}

export interface SupplierProduct {
  id: string
  supplierId: string
  rawName: string
  normalizedName: string
  ingredientId: string | null
  quantity: string
  unit: UnitCode
  lastUnitCostGross: string | null
  timesSeen: number
  lastSeenAt: string | null
  ingredient: { id: string; name: string; displayUnit: string } | null
}

export interface PurchaseItem {
  id: string
  purchaseId: string
  rawDescription: string
  ingredientId: string | null
  quantity: string
  unit: UnitCode
  unitCostGross: string
  lineTotalGross: string
  confidence: string | null
  mappingSource: string | null
  taxRate: string | null
  taxAmount: string | null
}

export interface PurchaseListItem {
  id: string
  branchId: string | null
  supplierId: string | null
  folio: string | null
  purchasedAt: string
  total: string
  status: PurchaseStatus
  documentKey: string | null
  confidence: string | null
  notes: string | null
  createdAt: string
  approvedAt: string | null
  supplier: { id: string; name: string } | null
  branch: { id: string; name: string } | null
  _count: { items: number }
}

export interface PurchaseDetail extends Omit<PurchaseListItem, "_count"> {
  documentMime: string | null
  extractedJson: unknown
  dedupeKey: string | null
  createdBy: string | null
  approvedBy: string | null
  updatedAt: string
  items: PurchaseItem[]
  documentUrl: string | null
}

/** Id de la compra de la que esta parece duplicada, si el extractor lo marcó. */
export function duplicatePurchaseId(purchase: {
  extractedJson: unknown
}): string | null {
  const meta = purchase.extractedJson

  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null

  const value = (meta as Record<string, unknown>).duplicateOf

  return typeof value === "string" && value.length > 0 ? value : null
}
