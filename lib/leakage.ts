export interface LeakageUser {
  userId: string
  name: string | null
  username: string | null
  email: string | null
  cancellations: number
  refunds: number
  ordersClosed: number
  ordersWithoutPayment: number
  sales: number
  riskScore: number
}

export interface LeakageOrder {
  id: string
  userId: string | null
  ticketNumber: number | null
  tableNumber: string | null
  total: number
  paid: number
  missing: number
  createdAt: string
}

export interface LeakageDiscount {
  id: string
  userId: string | null
  ticketNumber: number | null
  expected: number
  total: number
  difference: number
  createdAt: string
}

export interface LeakageSummary {
  orders: number
  cancelledOrders: number
  cancellations: number
  refunds: number
  ordersWithoutPayment: number
  missingAmount: number
  discounts: number
  discountAmount: number
  usersFlagged: number
}

export interface LeakageReport {
  from: string
  to: string
  days: number
  summary: LeakageSummary | null
  users: LeakageUser[]
  ordersWithoutPayment: LeakageOrder[]
  discounts: LeakageDiscount[]
}
