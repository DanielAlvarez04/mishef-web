/** Mesa física del salón y sus cuentas abiertas. */
export interface DiningTable {
  id: string
  organizationId: string
  branchId: string
  number: string
  zone: string | null
  seats: number
  isActive: boolean
  sortOrder: number
  activeOrders: Array<{
    id: string
    status: string
    channel: string
    tableNumber: string | null
    customerName: string | null
    partySize: number
    total: string
    createdAt: string
  }>
}

export function tableLabel(table: DiningTable): string {
  return `Mesa ${table.number}`
}
