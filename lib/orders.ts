import type { PromotionType } from "./catalog"

export type OrderStatus = "OPEN" | "CLOSED" | "CANCELLED"

export type OrderChannel = "DINE_IN" | "COUNTER" | "PHONE" | "DELIVERY"

export const ORDER_CHANNEL_LABELS: Record<OrderChannel, string> = {
  DINE_IN: "Mesa",
  COUNTER: "Mostrador",
  PHONE: "Drive-Thru",
  DELIVERY: "Domicilio",
}

export type PaymentMethod =
  | "CASH"
  | "CARD"
  | "TRANSFER"
  | "MERCADO_PAGO_POINT"
  | "MERCADO_PAGO_LINK"

export type PaymentStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED"

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  MERCADO_PAGO_POINT: "Tarjeta · Terminal Point",
  MERCADO_PAGO_LINK: "Mercado Pago (link)",
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  CANCELLED: "Anulado",
  REFUNDED: "Reembolsado",
}

export interface Payment {
  id: string
  method: PaymentMethod
  amount: string
  tipAmount?: string
  tipPercent?: string | null
  tipSource?: TipSource | null
  tipBaseAmount?: string | null
  tipRecipientId?: string | null
  cashReceived?: string | null
  changeGiven?: string | null
  sessionId?: string | null
  /** Referencia externa del cobro (autorización, voucher o terminal ajena). */
  reference?: string | null
  /** Dispositivo que capturó el cobro sin conexión. */
  offlineDeviceId?: string | null
  createdOfflineAt?: string | null
  reviewRequired?: boolean
  reviewReason?: string | null
  status: PaymentStatus
  paidAt: string | null
  confirmedAt: string | null
  createdAt: string
  provider?: string | null
  providerOrderId?: string | null
  providerStatus?: string | null
  providerStatusDetail?: string | null
  terminalId?: string | null
  splitId?: string | null
  split?: {
    id: string
    label: string | null
    expectedAmount: string
    status: SplitStatus
  } | null
  user: { id: string; name: string | null; username: string | null } | null
  confirmedBy: { id: string; name: string | null; username: string | null } | null
  tipRecipient?: {
    id: string
    name: string | null
    username: string | null
  } | null
}

export type TipSource =
  | "NONE"
  | "SUGGESTED"
  | "CUSTOM"
  | "CUSTOMER_DISPLAY"
  | "TERMINAL"

export type SplitMode = "BY_GUEST" | "EQUAL" | "CUSTOM"
export type SplitStatus = "OPEN" | "PAID" | "CANCELLED"

/** Parte de una cuenta dividida para cobrarla. */
export interface OrderSplit {
  id: string
  label: string | null
  mode: SplitMode
  status: SplitStatus
  guestId: string | null
  guestName: string | null
  expectedAmount: number
  paidAmount: number
  pendingAmount: number
  remainingAmount: number
  sortOrder: number
  payments?: Array<{
    id: string
    amount: string
    status: PaymentStatus
    method: PaymentMethod
  }>
}

/** Pago tal como lo entrega el resumen de cobro (sin relaciones). */
export interface ChargeSummaryPayment {
  id: string
  method: PaymentMethod
  amount: string
  tipAmount: string
  status: PaymentStatus
  splitId: string | null
  provider: string | null
  createdAt: string
  confirmedAt: string | null
}

/** Resumen ligero que consume el diálogo de cobro. */
export interface ChargeSummary {
  id: string
  tableNumber: string | null
  partySize: number
  channel: OrderChannel
  customerName: string | null
  total: string
  subtotal: string
  taxTotal: string
  deliveryFee: string
  paidTotal: string
  balance: string
  payments: ChargeSummaryPayment[]
  guests: OrderGuest[]
  rounds: Array<{
    id: string
    items: Array<{
      id: string
      itemName: string
      variantName: string | null
      quantity: number
      subtotal: string
      guestId: string | null
      guestName: string | null
      notes: string | null
    }>
  }>
  splits: OrderSplit[]
}


export type RoundStatus =
  | "PENDING"
  | "HELD"
  | "PENDING_PAYMENT"
  | "FIRED"
  | "PREPARING"
  | "READY"
  | "PICKED_UP"
  | "DELIVERED"
  | "CANCELLED"

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  OPEN: "Abierta",
  CLOSED: "Cerrada",
  CANCELLED: "Cancelada",
}

export const ROUND_STATUS_LABELS: Record<RoundStatus, string> = {
  PENDING: "Pendiente",
  HELD: "En espera",
  PENDING_PAYMENT: "Pendiente de pago",
  FIRED: "Disparada",
  PREPARING: "En preparación",
  READY: "Lista",
  PICKED_UP: "Recogida",
  DELIVERED: "Entregada",
  CANCELLED: "Cancelada",
}

export interface RoundAction {
  status: RoundStatus
  label: string
  variant: "default" | "outline" | "destructive"
}

/** Transiciones que la API permite desde cada estado (plan.md §6.6). */
export const ROUND_ACTIONS: Record<RoundStatus, RoundAction[]> = {
  PENDING: [
    { status: "PREPARING", label: "Empezar", variant: "default" },
    { status: "CANCELLED", label: "Cancelar", variant: "destructive" },
  ],
  PREPARING: [
    { status: "READY", label: "Marcar lista", variant: "default" },
    { status: "CANCELLED", label: "Cancelar", variant: "destructive" },
  ],
  READY: [
    { status: "DELIVERED", label: "Entregar", variant: "outline" },
    { status: "CANCELLED", label: "Cancelar", variant: "destructive" },
  ],
  DELIVERED: [],
  CANCELLED: [],
  HELD: [],
  PENDING_PAYMENT: [
    { status: "CANCELLED", label: "Cancelar", variant: "destructive" },
  ],
  FIRED: [],
  PICKED_UP: [],
}

export interface OrderItemExtra {
  id: string
  itemExtraId: string | null
  extraName: string
  extraPrice: string
}

export interface OrderItemExclusion {
  id: string
  ingredientId: string
  ingredient: {
    id: string
    name: string
    baseUnit: string
    displayUnit: string
  }
}

export interface OrderItemOption {
  id: string
  itemOptionValueId: string | null
  groupName: string
  optionName: string
  kitchenLabel: string | null
  priceDelta: string
}

export interface OrderItem {
  id: string
  itemId: string
  itemVariantId: string | null
  itemName: string
  variantName: string | null
  itemPrice: string
  taxRate: string | null
  taxAmount: string
  quantity: number
  notes: string | null
  subtotal: string
  /** Descuento aplicado por una promoción del combo. */
  discountAmount: string
  /** Snapshot de la promoción aplicada, para reportes y marketing. */
  promotionId: string | null
  promotionName: string | null
  promotionType: PromotionType | null
  /** Persona de la cuenta a la que pertenece la línea. */
  guestId?: string | null
  guestName?: string | null
  extras: OrderItemExtra[]
  options: OrderItemOption[]
  exclusions: OrderItemExclusion[]
}

export interface StatusHistoryEntry {
  id: string
  previousStatus: string | null
  newStatus: string
  changedAt: string
  reason: string | null
  changedBy: { id: string; name: string | null; username: string | null } | null
}

export interface OrderRound {
  id: string
  orderId?: string
  status: RoundStatus
  sentAt: string | null
  startedAt: string | null
  readyAt: string | null
  deliveredAt: string | null
  cancelledAt: string | null
  /** Estimado de preparación congelado al enviar la ronda. */
  estimatedMinutes?: number | null
  createdAt: string
  items: OrderItem[]
  statusHistory?: StatusHistoryEntry[]
}

export interface OrderSummaryRound {
  id: string
  status: RoundStatus
  sentAt: string | null
  createdAt: string
  _count: { items: number }
}

export interface OrderGuest {
  id: string
  name: string
  title: GuestTitle | null
  sex: GuestSex | null
  ageRange: GuestAgeRange | null
  sortOrder: number
}

export type GuestSex = "MASCULINO" | "FEMENINO" | "LGBT"

export const GUEST_SEX_LABELS: Record<GuestSex, string> = {
  MASCULINO: "Masculino",
  FEMENINO: "Femenino",
  LGBT: "LGBT+",
}

export const GUEST_SEXES: GuestSex[] = ["MASCULINO", "FEMENINO", "LGBT"]

export type GuestAgeRange = "NINO" | "JOVEN" | "ADULTO" | "ADULTO_MAYOR"

export const GUEST_AGE_RANGE_LABELS: Record<GuestAgeRange, string> = {
  NINO: "Niño/a",
  JOVEN: "Joven",
  ADULTO: "Adulto",
  ADULTO_MAYOR: "Adulto mayor",
}

export const GUEST_AGE_RANGES: GuestAgeRange[] = [
  "NINO",
  "JOVEN",
  "ADULTO",
  "ADULTO_MAYOR",
]

export type GuestTitle =
  | "NINO"
  | "NINA"
  | "JOVEN"
  | "SENORITA"
  | "SENOR"
  | "SENORA"
  | "SENOR_MAYOR"
  | "SENORA_MAYOR"

export const GUEST_TITLE_LABELS: Record<GuestTitle, string> = {
  NINO: "Niño",
  NINA: "Niña",
  JOVEN: "Joven",
  SENORITA: "Señorita",
  SENOR: "Señor",
  SENORA: "Señora",
  SENOR_MAYOR: "Señor mayor",
  SENORA_MAYOR: "Señora mayor",
}

export const GUEST_TITLES: GuestTitle[] = [
  "NINO",
  "NINA",
  "JOVEN",
  "SENORITA",
  "SENOR",
  "SENORA",
  "SENOR_MAYOR",
  "SENORA_MAYOR",
]

export interface Order {
  id: string
  /** `true` cuando la API la devolvió por reconciliación de mesa offline. */
  reconciled?: boolean
  tableNumber: string | null
  /** Número de comensales de la mesa. */
  partySize: number
  isTakeaway: boolean
  channel?: OrderChannel
  customerName?: string | null
  customerPhone?: string | null
  deliveryAddress?: string | null
  deliveryFee?: string
  scheduledAt?: string | null
  ticketNumber?: number | null
  /** Folio de reclamos: AAAAMMDD + consecutivo. */
  ticketUid?: string | null
  /** Nombre histórico de quien tomó la orden. */
  servedByName?: string | null
  status: OrderStatus
  subtotal: string
  taxTotal: string
  total: string
  createdAt: string
  /** Sucursal donde se abrió la cuenta; `null` en cuentas antiguas. */
  branch?: { id: string; name: string } | null
  user: { id: string; name: string | null; username: string | null } | null
  rounds: (OrderRound | OrderSummaryRound)[]
  guests?: OrderGuest[]
  payments?: Payment[]
  tables?: Array<{
    id: string
    isPrimary: boolean
    table: {
      id: string
      number: string
      zone: string | null
      seats: number
    }
  }>
  splits?: OrderSplit[]
  paidTotal?: string
  balance?: string
}

export type PrepPriority = "on_time" | "at_risk" | "late"

export const PREP_PRIORITY_LABELS: Record<PrepPriority, string> = {
  on_time: "A tiempo",
  at_risk: "En riesgo",
  late: "Atrasada",
}

/**
 * Prioridad de una ronda según su urgencia (tiempo en etapa / estimado).
 *
 * Misma regla que la API: 100 % o más es atrasada, 75 % es riesgo.
 */
export function prepPriority(urgency: number): PrepPriority {
  if (urgency >= 1) return "late"
  if (urgency >= 0.75) return "at_risk"
  return "on_time"
}

/**
 * Ronda de cocina con el estimado y la prioridad calculados por la API.
 *
 * `stageMinutes`, `urgency` y `suggestedRank` llegan con la hora del servidor;
 * el tablero los refresca por SSE o sondeo.
 */
export interface KitchenRound extends OrderRound {
  order: {
    id: string
    tableNumber: string | null
    isTakeaway: boolean
    channel?: OrderChannel
    customerName?: string | null
    customerPhone?: string | null
    deliveryAddress?: string | null
    status: OrderStatus
    total: string
    createdAt: string
    ticketNumber?: number | null
    branch?: { id: string; name: string } | null
  }
  /** Minutos estimados que se están usando (snapshot o respaldo actual). */
  estimateMinutes: number
  /** `true` si el estimado quedó congelado al enviar la ronda. */
  estimateFromSnapshot: boolean
  /** Minutos transcurridos en la etapa actual. */
  stageMinutes: number
  /** Minutos desde el envío. */
  waitMinutes: number
  /** Unidades de la ronda (suma de cantidades). */
  itemCount: number
  /** `stageMinutes / estimateMinutes`. */
  urgency: number
  priority: PrepPriority
  score: number
  /** Motivos cortos y legibles de la prioridad. */
  reasons: string[]
  estimatedReadyAt: string
  /** Posición en la cola sugerida (solo PENDING/PREPARING). */
  suggestedRank: number | null
}

export interface ConsumptionWarning {
  ingredientId: string
  name: string
  stockAfter: string
}

export function canDraftOrders(roles: string[]): boolean {
  return roles.some((role) =>
    ["ADMIN", "WAITER", "CASHIER"].includes(role)
  )
}

export function canSendOrders(roles: string[]): boolean {
  return roles.some((role) => ["ADMIN", "WAITER", "CASHIER"].includes(role))
}

export function canWorkKitchen(roles: string[]): boolean {
  return roles.some((role) => ["ADMIN", "KITCHEN"].includes(role))
}

/** Registrar pagos: ADMIN, CASHIER y WAITER (plan.md §5). */
export function canRegisterPayments(roles: string[]): boolean {
  return roles.some((role) =>
    ["ADMIN", "CASHIER", "WAITER"].includes(role)
  )
}

/** Confirmar pagos y cerrar cuentas: ADMIN y CASHIER. */
export function canConfirmPayments(roles: string[]): boolean {
  return roles.some((role) => ["ADMIN", "CASHIER"].includes(role))
}

/** Reembolsar un pago ya confirmado: solo ADMIN. */
export function canRefundPayments(roles: string[]): boolean {
  return roles.includes("ADMIN")
}

/** Ver importes y reportes de ventas: ADMIN y CASHIER. */
export function canReadMoney(roles: string[]): boolean {
  return roles.some((role) => ["ADMIN", "CASHIER"].includes(role))
}

/** Abrir/cerrar la caja y registrar movimientos: ADMIN y CASHIER. */
export function canManageCash(roles: string[]): boolean {
  return roles.some((role) => ["ADMIN", "CASHIER"].includes(role))
}

/** `42` → `#042`; sin número devuelve `null`. */
export function ticketCode(value: number | null | undefined): string | null {
  if (!value) return null

  return `#${String(value).padStart(3, "0")}`
}

/** "Mesa 4", "Mostrador", "Teléfono" o "Domicilio". */
export function orderLabel(order: {
  tableNumber: string | null
  isTakeaway: boolean
  channel?: OrderChannel
  customerName?: string | null
  tables?: Array<{ table: { number: string } }>
}): string {
  const channel = order.channel
  if (channel === "DELIVERY") return "Domicilio"
  if (channel === "PHONE") return "Drive-Thru"
  if (channel === "COUNTER") return "Mostrador"
  if (order.tables && order.tables.length > 1) {
    return `Mesas ${order.tables.map((row) => row.table.number).join(" + ")}`
  }
  if (order.tableNumber) return `Mesa ${order.tableNumber}`
  return order.isTakeaway ? "Mostrador" : "Sin mesa"
}

/**
 * Minutos transcurridos desde una fecha ISO.
 *
 * `now` permite congelar la referencia en el render del servidor y reutilizarla
 * durante la hidratación, de modo que el HTML y el primer render del cliente
 * coincidan.
 */
export function elapsedMinutes(
  value: string | null,
  now: number = Date.now()
): number {
  if (!value) return 0
  return Math.max(0, Math.floor((now - new Date(value).getTime()) / 60000))
}

/** Minutos entre dos fechas ISO, o `null` si falta alguna. */
export function minutesBetween(
  from: string | null,
  to: string | null
): number | null {
  if (!from || !to) return null
  const diff = new Date(to).getTime() - new Date(from).getTime()
  return Math.max(0, Math.round(diff / 60000))
}

export interface RoundTimings {
  /** Enviada → empezada (espera en cola). */
  waitMinutes: number | null
  /** Empezada → lista (preparación). */
  prepMinutes: number | null
  /** Lista → entregada (traslado a la mesa). */
  deliveryMinutes: number | null
  /** Enviada → entregada (ciclo completo). */
  totalMinutes: number | null
  /** Etapa actual y minutos que lleva en ella. */
  stage: { status: RoundStatus; since: string | null; minutes: number } | null
}

/**
 * Duraciones entre las etapas de una comanda.
 *
 * Las etapas sin marca de tiempo quedan en `null` para no inventar tiempos; la
 * etapa en curso se mide hasta ahora.
 */
export function roundTimings(
  round: {
    status: RoundStatus
    sentAt: string | null
    startedAt: string | null
    readyAt: string | null
    deliveredAt: string | null
    createdAt: string
  },
  now: number = Date.now()
): RoundTimings {
  const sent = round.sentAt ?? round.createdAt
  const stageSince =
    round.status === "PENDING"
      ? sent
      : round.status === "PREPARING"
        ? round.startedAt
        : round.status === "READY"
          ? round.readyAt
          : round.status === "DELIVERED"
            ? round.deliveredAt
            : null

  return {
    waitMinutes: minutesBetween(sent, round.startedAt),
    prepMinutes: minutesBetween(round.startedAt, round.readyAt),
    deliveryMinutes: minutesBetween(round.readyAt, round.deliveredAt),
    totalMinutes: minutesBetween(sent, round.deliveredAt),
    stage:
      stageSince && ["PENDING", "PREPARING", "READY"].includes(round.status)
        ? {
            status: round.status,
            since: stageSince,
            minutes: elapsedMinutes(stageSince, now),
          }
        : null,
  }
}

/** "8 min", "1 h 12 min" o "menos de 1 min". */
export function formatDuration(minutes: number | null): string {
  if (minutes === null) return "—"
  if (minutes < 1) return "menos de 1 min"
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}
