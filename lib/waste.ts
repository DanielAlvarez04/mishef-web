export type WasteReasonCode =
  | "EXPIRED"
  | "DAMAGED"
  | "SPILL"
  | "OVERPRODUCTION"
  | "OTHER"

export const WASTE_REASONS: Array<{ value: WasteReasonCode; label: string }> = [
  { value: "EXPIRED", label: "Caducó" },
  { value: "DAMAGED", label: "Dañado" },
  { value: "SPILL", label: "Derrame / accidente" },
  { value: "OVERPRODUCTION", label: "Sobró producción" },
  { value: "OTHER", label: "Otro" },
]

export interface WasteItem {
  id: string
  ingredientName: string
  quantity: string
  displayUnit: string
  reason: WasteReasonCode
  note: string | null
  cost: number
  photoUrl: string | null
  createdAt: string
  user: { id: string; name: string | null; username: string | null } | null
}

export interface WasteList {
  items: WasteItem[]
  total: number
  byReason: Array<{ reason: WasteReasonCode; count: number; cost: number }>
}

export interface WasteIngredient {
  id: string
  name: string
  displayUnit: string
  currentStock?: string
}

export function reasonLabel(reason: string): string {
  return WASTE_REASONS.find((item) => item.value === reason)?.label ?? reason
}
