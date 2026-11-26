"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangleIcon,
  ArrowDownToLineIcon,
  ArrowUpDownIcon,
  BanknoteIcon,
  CakeIcon,
  CopyIcon,
  CreditCardIcon,
  GroupIcon,
  LayoutGridIcon,
  Loader2Icon,
  LockIcon,
  MinusIcon,
  MoreVerticalIcon,
  NotebookTextIcon,
  PencilLineIcon,
  PlusIcon,
  PrinterIcon,
  ReceiptTextIcon,
  SearchIcon,
  SparklesIcon,
  Trash2Icon,
  Undo2Icon,
  WalletIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useOfflineSync } from "@/components/offline/offline-provider"
import { PendingOperations } from "@/components/offline/pending-operations"
import { useShortcut } from "@/components/keyboard/keyboard-shortcuts-provider"
import * as posCapture from "@/components/pos/pos-capture"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useWakeLock } from "@/hooks/use-wake-lock"
import { Can } from "@/components/features-provider"
import { OrderDeck, adjacentOrderId } from "@/components/pos/order-deck"
import { ArticleCardVisual, type ArticleCardTextSize } from "@/components/catalog/article-card-visual"
import { usePersistentBoolean } from "@/hooks/use-persistent-boolean"
import { usePersistentCardColumns } from "@/hooks/use-persistent-card-columns"
import { usePersistentNumber } from "@/hooks/use-persistent-number"
import { usePersistentTab } from "@/hooks/use-persistent-tab"
import {
  PROMOTION_TYPE_LABELS,
  formatTime,
  isItemOptionValueAvailable,
  itemOptionValueName,
  type ItemListItem,
} from "@/lib/catalog"
import { useMoney } from "@/lib/currency"

import {
  addOrderGuest,
  createOrder,
  getChargeSummary,
  removeOrderGuest,
  sendRound,
  updateOrderGuest,
  type RoundItemInput,
} from "@/lib/order-actions"
import { API_BASE_URL } from "@/lib/api-base"
import type { CashSessionPayload } from "@/lib/cash"
import type { Menu, MenuTrendingItem } from "@/lib/menus"
import { printOrderReceipt } from "@/lib/mercadopago-actions"
import type { MercadoPagoPointConfig } from "@/lib/mercadopago"
import type { PosDisplayInfo, PosDisplayState } from "@/lib/pos-display"
import {
  GUEST_AGE_RANGES,
  GUEST_AGE_RANGE_LABELS,
  GUEST_SEXES,
  GUEST_SEX_LABELS,
  ORDER_CHANNEL_LABELS,
  orderLabel,
  ticketCode,
  type ChargeSummary,
  type GuestAgeRange,
  type GuestSex,
  type Order,
  type OrderChannel,
  type OrderGuest,
} from "@/lib/orders"
import { trackEvent } from "@/lib/analytics"
import { jalapenoChipClass } from "@/lib/chips"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PosCatalog } from "@/components/pos/pos-catalog"

import { CashSessionActions, CashSessionDialog, type CashSessionAction } from "./cash-session"
import { ChargeDialog } from "./charge-dialog"
import { OfflineCheckoutDialog } from "./offline-checkout-dialog"

const CHANNELS: OrderChannel[] = ["DINE_IN", "COUNTER", "PHONE", "DELIVERY"]

/** Mesas disponibles por ahora (1–25). */
const TABLE_OPTIONS = Array.from({ length: 25 }, (_, index) =>
  String(index + 1)
)

/** Escalas de texto de las cards del catálogo (1 = chico, 4 = extra grande). */
const CARD_TEXT_SCALES = ["md", "lg", "xl", "2xl"] as const

/** Orden de las cards del catálogo del POS. */
type PosSortOrder = "default" | "az" | "za" | "price-asc" | "price-desc"

const SORT_OPTIONS: ReadonlyArray<{ value: PosSortOrder; label: string }> = [
  { value: "default", label: "Default" },
  { value: "az", label: "a-z" },
  { value: "za", label: "z-a" },
  { value: "price-asc", label: "menor a mayor precio" },
  { value: "price-desc", label: "mayor a menor precio" },
]

const POS_SORT_ORDERS = SORT_OPTIONS.map((option) => option.value)

/** Orden alfabético en español, insensible a mayúsculas y acentos. */
const PRODUCT_NAME_COLLATOR = new Intl.Collator("es", {
  sensitivity: "base",
  numeric: true,
})

interface CartExtra {
  id: string
  name: string
  price: number
}

interface CartOption {
  itemOptionValueId: string
  groupName: string
  name: string
  price: number
}

/** Agrupa las opciones de una línea por su grupo, conservando el orden. */
function groupCartOptions(options: CartOption[]) {
  const groups = new Map<string, CartOption[]>()

  for (const option of options) {
    const list = groups.get(option.groupName) ?? []
    list.push(option)
    groups.set(option.groupName, list)
  }

  return [...groups.entries()]
}

interface CartLine {
  key: string
  itemId: string
  itemName: string
  variantId?: string
  variantName?: string
  unitPrice: number
  quantity: number
  notes?: string
  extras: CartExtra[]
  options: CartOption[]
  excludedIngredientIds: string[]
  excludedNames: string[]
  /** Cliente (comensal) al que pertenece la línea.
ull` = General/Mesa. */
  guestKey?: string | null
}

/** Cliente de la mesa mientras la cuenta es un borrador local. */
interface GuestDraft {
  /** Clave local estable; para clientes ya guardados es su id. */
  key: string
  id?: string
  /** Nombre visible; se actualiza al escribir aunque aún no se guarde. */
  name: string
  /** Último nombre confirmado en el servidor. */
  savedName: string
  /** Sexo declarado (opcional). */
  sex: GuestSex | null
  /** Rango de edad declarado (opcional). */
  ageRange: GuestAgeRange | null
}

/**
 * Comanda capturada que todavía no se envió.
 *
 * Se guarda por cuenta al cambiar de comanda para no perder la captura si el
 * mesero revisa otra mesa. Vive solo en memoria: al recargar se pierde, igual
 * que antes.
 */
interface OrderDraft {
  cart: CartLine[]
  channel: OrderChannel
  tableNumber: string
  customerName: string
  customerSex: GuestSex | null
  customerAgeRange: GuestAgeRange | null
  customerPhone: string
  deliveryAddress: string
  deliveryFee: string
  guests: GuestDraft[]
  partySize: number
  partySizeDraft: string
  activeGuestKey: string | null
}

function newGuestKey() {
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function cartLineTotal(line: CartLine): number {
  return line.unitPrice * line.quantity
}

/** Firma del resumen de cobro para invalidar el caché cuando cambia la cuenta. */
function chargeSummaryCacheKey(order: Order): string {
  return `${order.id}:${order.total}:${order.rounds.length}:${
    order.payments?.length ?? 0
  }`
}

function newCartKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Solo se pueden convertir líneas sin opciones, extras, notas ni exclusiones. */
function isPlainLine(line: CartLine): boolean {
  return (
    line.extras.length === 0 &&
    line.options.length === 0 &&
    line.excludedIngredientIds.length === 0 &&
    !line.notes?.trim()
  )
}

interface ComboConsumption {
  key: string
  quantity: number
}

interface ComboMatch {
  combo: ItemListItem
  consumption: ComboConsumption[]
  line: CartLine
  componentsTotal: number
  comboPrice: number
}

/**
 * Busca combos cuyos componentes estén disponibles en el carrito. Solo se
 * consideran combos que incluyan la línea que acaba de agregarse/cambiarse.
 */
function findComboMatches(
  cart: CartLine[],
  products: ItemListItem[],
  trigger: { itemId: string; variantId?: string }
): ComboMatch[] {
  const matches: ComboMatch[] = []
  const triggerVariant = trigger.variantId ?? ""

  for (const combo of products) {
    if (!combo.isCombo || !combo.isActive) continue
    if (combo.variants.some((variant) => variant.isActive)) continue
    if ((combo.optionGroups?.length ?? 0) > 0) continue

    const components = combo.comboComponents ?? []
    if (components.length === 0) continue

    const includesTrigger = components.some(
      (component) =>
        component.componentItem.id === trigger.itemId &&
        (component.variant?.id ?? "") === triggerVariant
    )
    if (!includesTrigger) continue

    const consumption: ComboConsumption[] = []
    let componentsTotal = 0
    let complete = true

    for (const component of components) {
      let remaining = component.quantity

      const lines = cart.filter(
        (line) =>
          isPlainLine(line) &&
          line.itemId === component.componentItem.id &&
          (line.variantId ?? "") === (component.variant?.id ?? "")
      )

      for (const line of lines) {
        if (remaining <= 0) break

        const take = Math.min(line.quantity, remaining)
        consumption.push({ key: line.key, quantity: take })
        componentsTotal += line.unitPrice * take
        remaining -= take
      }

      if (remaining > 0) {
        complete = false
        break
      }
    }

    if (!complete) continue

    const comboPrice = Number(combo.price)

    matches.push({
      combo,
      consumption,
      componentsTotal,
      comboPrice,
      line: {
        key: newCartKey(),
        itemId: combo.id,
        itemName: combo.name,
        unitPrice: comboPrice,
        quantity: 1,
        extras: [],
        options: [],
        excludedIngredientIds: [],
        excludedNames: [],
      },
    })
  }

  return matches
}

function consumeComponents(
  cart: CartLine[],
  consumption: ComboConsumption[]
): CartLine[] {
  return cart.flatMap((line) => {
    const take =
      consumption.find((item) => item.key === line.key)?.quantity ?? 0
    if (take === 0) return [line]

    const remaining = line.quantity - take
    return remaining > 0 ? [{ ...line, quantity: remaining }] : []
  })
}

function lineToInput(line: CartLine): RoundItemInput {
  return {
    itemId: line.itemId,
    variantId: line.variantId,
    quantity: line.quantity,
    notes: line.notes,
    extras: line.extras.map((extra) => ({ extraId: extra.id })),
    options:
      line.options.length > 0
        ? line.options.map((option) => ({
            itemOptionValueId: option.itemOptionValueId,
          }))
        : undefined,
    excludedIngredientIds:
      line.excludedIngredientIds.length > 0
        ? line.excludedIngredientIds
        : undefined,
  }
}

/**
 * Etiqueta corta de una cuenta para el selector del POS.
 *
 * Mesas: «Mesa 4». Mostrador: nombre del cliente o el consecutivo del ticket.
 */
function orderSelectLabel(
  order: Pick<
    Order,
    "tableNumber" | "isTakeaway" | "channel" | "customerName" | "ticketNumber"
  >
): string {
  const channel = order.channel
  const isCounter = channel === "COUNTER" || (!channel && order.isTakeaway)
  const ticket = ticketCode(order.ticketNumber)
  let label: string

  if (isCounter) {
    label = order.customerName?.trim() || "Mostrador"
  } else {
    label = orderLabel(order)
  }

  return ticket ? `${ticket} · ${label}` : label
}

/**
 * Tarjeta del catálogo del POS.
 *
 * Está memoizada porque el POS re-renderiza toda la grilla con cada cambio del
 * carrito o del buscador; sin esto se reconcilian cientos de tarjetas aunque
 * solo cambie una.
 */
export function PosView({
  products,
  orders,
  menus,
  trendingItems,
  canDraft,
  canSend,
  canRegister,
  canConfirm,
  mercadoPago,
  cash,
  canManageCash,
  displays,
  taxRate,
}: {
  products: ItemListItem[]
  orders: Order[]
  menus: Menu[]
  /** Ventas de los últimos 30 días para el chip «Tendencia». */
  trendingItems: MenuTrendingItem[]
  canDraft: boolean
  canSend: boolean
  canRegister: boolean
  canConfirm: boolean
  /** Terminales Point disponibles para cobrar. */
  mercadoPago: MercadoPagoPointConfig
  /** Turno de caja abierto de la sucursal. */
  cash: CashSessionPayload
  /** Abrir/cerrar caja y movimientos (ADMIN/CASHIER). */
  canManageCash: boolean
  /** Pantallas de cliente del negocio. */
  displays: PosDisplayInfo[]
  /** IVA del negocio; se usa cuando el artículo no define una tasa propia. */
  taxRate: string
}) {
  const router = useRouter()
  useWakeLock()
  const money = useMoney()
  const offline = useOfflineSync()

  const [search, setSearch] = React.useState("")
  // El filtrado se hace con el valor diferido: escribir en el buscador no
  // bloquea el pintado de la grilla.
  const deferredSearch = React.useDeferredValue(search)
  const menuIds = React.useMemo(() => menus.map((menu) => menu.id), [menus])
  // El menú elegido se recuerda por dispositivo. Si el guardado ya no existe
  // (otra sucursal u otra organización), se usa el menú global.
  const [menuId, setMenuId] = usePersistentTab<string>(
    "pos-menu-id",
    menuIds,
    menus.find((menu) => menu.isGlobal)?.id ?? menus[0]?.id ?? ""
  )
  const [cardColumns, setCardColumns] = usePersistentCardColumns(
    "pos-card-columns",
    4,
    4,
    7
  )
  const [cardTextSize, setCardTextSize] = usePersistentNumber(
    "pos-card-text-size",
    3,
    1,
    4
  )
  const cardTextScale = CARD_TEXT_SCALES[cardTextSize - 1] ?? "md"
  const [sortOrder, setSortOrder] = usePersistentTab<PosSortOrder>(
    "pos-sort-order",
    POS_SORT_ORDERS,
    "default"
  )
  // «Altura de tarjetas»: cuadrada o panorámica (la altura de cuando no había
  // imagen). Ancho y texto tienen sus propios controles persistidos.
  const [squareCards, setSquareCards] = usePersistentBoolean(
    "pos-card-square",
    true
  )
  // Diálogos de caja abiertos desde el menú móvil de tres puntos.
  const [cashAction, setCashAction] =
    React.useState<CashSessionAction | null>(null)
  const dialogOpenedAtRef = React.useRef<number | null>(null)
  const dialogSavedRef = React.useRef(false)
  const [cart, setCart] = React.useState<CartLine[]>([])
  const cartRef = React.useRef<CartLine[]>([])
  React.useEffect(() => {
    cartRef.current = cart
  }, [cart])
  const [selectedProduct, setSelectedProduct] =
    React.useState<ItemListItem | null>(null)
  const [pendingProductId, setPendingProductId] = React.useState<string | null>(
    null
  )
  const [charging, setCharging] = React.useState(false)
  const [printingAccount, setPrintingAccount] = React.useState(false)

  const [comboNotice, setComboNotice] = React.useState<{
    message: string
    undo: () => void
  } | null>(null)
  const [comboUndoAvailable, setComboUndoAvailable] = React.useState(false)
  const comboUndoTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [comboConflict, setComboConflict] = React.useState<{
    cart: CartLine[]
    matches: ComboMatch[]
  } | null>(null)

  const [orderId, setOrderId] = React.useState("")
  /** Cuenta recién creada que el refresh aún no incluye en `orders`. */
  const [pendingOrder, setPendingOrder] = React.useState<Order | null>(null)
  const [offlineCharging, setOfflineCharging] = React.useState(false)
  // Canal preferido del dispositivo: se recuerda entre sesiones y se usa como
  // punto de partida de cada comanda nueva. El borrador abierto puede diferir
  // mientras se consulta una cuenta existente (`channelOverride`).
  const [preferredChannel, setPreferredChannel] =
    usePersistentTab<OrderChannel>("pos-channel", CHANNELS, "DINE_IN")
  const [channelOverride, setChannelOverride] =
    React.useState<OrderChannel | null>(null)
  const channel = channelOverride ?? preferredChannel

  /** Ajusta el canal de la comanda sin cambiar la preferencia guardada. */
  const setChannel = React.useCallback((next: OrderChannel) => {
    setChannelOverride(next)
  }, [])

  /** Vuelve a la preferencia del dispositivo (p. ej. al cerrar una cuenta). */
  const resetChannel = React.useCallback(() => {
    setChannelOverride(null)
  }, [])

  /** El usuario eligió un canal: además de la comanda, se guarda la preferencia. */
  const selectChannel = React.useCallback(
    (next: OrderChannel) => {
      setChannelOverride(next)
      setPreferredChannel(next)
    },
    [setPreferredChannel]
  )
  const [tableNumber, setTableNumber] = React.useState("1")
  const [customerName, setCustomerName] = React.useState("")
  const [customerSex, setCustomerSex] = React.useState<GuestSex | null>(null)
  const [customerAgeRange, setCustomerAgeRange] =
    React.useState<GuestAgeRange | null>(null)
  const [customerPhone, setCustomerPhone] = React.useState("")
  const [deliveryAddress, setDeliveryAddress] = React.useState("")
  const [deliveryFee, setDeliveryFee] = React.useState("0")
  const [guests, setGuests] = React.useState<GuestDraft[]>([])
  const [partySize, setPartySize] = React.useState(1)
  const [partySizeDraft, setPartySizeDraft] = React.useState("1")
  const [activeGuestKey, setActiveGuestKey] = React.useState<string | null>(null)
  const [guestRemoving, setGuestRemoving] = React.useState<GuestDraft | null>(
    null
  )
  const [guestBusy, setGuestBusy] = React.useState(false)
  const [displayId, setDisplayId] = React.useState(displays[0]?.id ?? "")
  const [displayState, setDisplayState] =
    React.useState<PosDisplayState | null>(null)
  const displaySession = React.useRef<string | null>(null)
  const [sending, setSending] = React.useState(false)

  /** Borradores por cuenta: no se pierden al revisar otra mesa. */
  const draftsRef = React.useRef(new Map<string, OrderDraft>())
  /** Evita que el efecto de sincronización pise un borrador restaurado. */
  const restoringRef = React.useRef<string | null>(null)

  const offlinePaidOrderIds = React.useMemo(
    () =>
      new Set(
        offline.operations
          .filter(
            (operation) =>
              operation.kind === "checkout" &&
              operation.payment.method !== "CARD" &&
              Boolean(operation.orderId)
          )
          .map((operation) => (operation as { orderId: string }).orderId)
      ),
    [offline.operations]
  )

  const offlineCheckoutOrderIds = React.useMemo(
    () =>
      new Set(
        offline.operations
          .filter(
            (operation) =>
              operation.kind === "checkout" && Boolean(operation.orderId)
          )
          .map((operation) => (operation as { orderId: string }).orderId)
      ),
    [offline.operations]
  )

  const visibleOrders = React.useMemo(
    () => orders.filter((order) => !offlinePaidOrderIds.has(order.id)),
    [offlinePaidOrderIds, orders]
  )

  // Incluye la cuenta recién creada aunque el refresh todavía no la traiga.
  const selectOrders = React.useMemo(() => {
    if (!pendingOrder) return orders
    if (orders.some((order) => order.id === pendingOrder.id)) return orders

    return [pendingOrder, ...orders]
  }, [orders, pendingOrder])

  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    if (!pendingOrder) return
    if (orders.some((order) => order.id === pendingOrder.id)) {
      setPendingOrder(null)
    }
  }, [orders, pendingOrder])
  /* eslint-enable react-hooks/set-state-in-effect */

  /** Cuentas abiertas de la más antigua a la más reciente (prioridad). */
  const deckOrders = React.useMemo(
    () =>
      [...visibleOrders].sort(
        (left, right) =>
          new Date(left.createdAt).getTime() -
          new Date(right.createdAt).getTime()
      ),
    [visibleOrders]
  )

  /** Incluye la cuenta recién creada y las abiertas, de la más antigua a la más nueva. */
  const carouselOrders = React.useMemo(() => {
    const list = [...visibleOrders]

    if (
      pendingOrder &&
      !list.some((order) => order.id === pendingOrder.id)
    ) {
      list.push(pendingOrder)
    }

    return list.sort(
      (left, right) =>
        new Date(left.createdAt).getTime() -
        new Date(right.createdAt).getTime()
    )
  }, [pendingOrder, visibleOrders])

  const activeOrder =
    visibleOrders.find((order) => order.id === orderId) ?? null
  const cashClosePending = cash.session
    ? offline.hasPendingCashClose(cash.session.id)
    : false
  const chargeSnapshot = React.useRef(new Map<string, ChargeSummary>())

  const activePayments = activeOrder?.payments ?? []
  const activePendingTotal = activePayments
    .filter((payment) => payment.status === "PENDING")
    .reduce((sum, payment) => sum + Number(payment.amount), 0)
  const activeConfirmedCount = activePayments.filter(
    (payment) => payment.status === "CONFIRMED"
  ).length

  // Precarga el resumen de cobro al seleccionar una cuenta: el diálogo abre
  // con datos y, si el usuario espera, se refresca en segundo plano.
  //
  // La dependencia es la firma de la cuenta, no el objeto `activeOrder`: cada
  // render del POS crea objetos nuevos y precargar en cada uno satura la API.
  const activeOrderId = activeOrder?.id ?? null
  const activeSummaryKey = activeOrder ? chargeSummaryCacheKey(activeOrder) : null

  React.useEffect(() => {
    if (!activeOrderId || !activeSummaryKey) return

    let cancelled = false

    getChargeSummary(activeOrderId).then((result) => {
      if (!cancelled && result.ok && result.data) {
        chargeSnapshot.current.set(activeSummaryKey, result.data)
      }
    })

    return () => {
      cancelled = true
    }
  }, [activeOrderId, activeSummaryKey])

  const activeGuest =
    activeGuestKey === null
      ? null
      : guests.find((guest) => guest.key === activeGuestKey) ?? null
  const isDineIn = activeOrder
    ? (activeOrder.channel ?? "DINE_IN") === "DINE_IN"
    : channel === "DINE_IN"
  const displayChannel = activeOrder?.channel ?? channel
  const total = cart.reduce((sum, line) => sum + cartLineTotal(line), 0)

  // La comanda se muestra como columna solo cuando hay ancho suficiente para
  // catálogo + panel (xl). En tablet horizontal y teléfono se usa el sheet.
  const showComandaColumn = useMediaQuery("(min-width: 1280px)", true)
  const [comandaOpen, setComandaOpen] = React.useState(false)
  const [pendingOpen, setPendingOpen] = React.useState(false)
  const [confirmNewComanda, setConfirmNewComanda] = React.useState(false)

  const comandaUnits =
    cart.reduce((count, line) => count + line.quantity, 0) +
    (activeOrder?.rounds ?? []).reduce((count, round) => {
      if (round.status === "CANCELLED") return count

      if ("items" in round) {
        return (
          count +
          round.items.reduce((roundCount, item) => roundCount + item.quantity, 0)
        )
      }

      return count + (round._count?.items ?? 0)
    }, 0)

  /**
   * El precio del catálogo es final (IVA incluido), así que el IVA se extrae
   * de cada línea y el subtotal es el neto. Se redondea por línea igual que
   * la API al enviar la ronda.
   */
  const taxBreakdown = React.useMemo(() => {
    const fallbackRate = Number(taxRate) || 0
    const rateByItem = new Map(
      products.map((product) => [
        product.id,
        Number(product.taxRate ?? fallbackRate) || 0,
      ])
    )
    let tax = 0

    for (const line of cart) {
      const rate = rateByItem.get(line.itemId) ?? fallbackRate
      const gross = cartLineTotal(line)

      if (rate > 0) {
        tax += Math.round((gross - gross / (1 + rate)) * 100) / 100
      }
    }

    tax = Math.round(tax * 100) / 100

    return { subtotal: Math.round((total - tax) * 100) / 100, tax }
  }, [cart, products, taxRate, total])

  // Sincroniza los clientes con la cuenta seleccionada. En un borrador nuevo
  // siempre existe al menos Cliente 1.
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    if (!activeOrder) {
      restoringRef.current = null
      setGuests((current) =>
        current.length > 0
          ? current
          : [{ key: newGuestKey(), name: "", savedName: "", sex: null, ageRange: null }]
      )
      setPartySize((current) => Math.max(1, current))
      return
    }

    // Al volver a una comanda con borrador, el estado restaurado manda sobre
    // el que viene del servidor (que puede ser más viejo).
    if (restoringRef.current === activeOrder.id) {
      restoringRef.current = null
      return
    }

    const serverGuests = activeOrder.guests ?? []

    setChannel(activeOrder.channel ?? "DINE_IN")
    setTableNumber(activeOrder.tableNumber ?? "1")
    // Los datos de contacto no deben arrastrarse de otra cuenta.
    setCustomerName(activeOrder.customerName ?? "")
    setCustomerPhone(activeOrder.customerPhone ?? "")
    setDeliveryAddress(activeOrder.deliveryAddress ?? "")
    setDeliveryFee(activeOrder.deliveryFee ?? "0")
    setGuests(
      serverGuests.map((guest) => ({
        key: guest.id,
        id: guest.id,
        name: guest.name,
        savedName: guest.name,
        sex: guest.sex ?? null,
        ageRange: guest.ageRange ?? null,
      }))
    )
    setPartySize(
      Math.min(20, activeOrder.partySize ?? Math.max(1, serverGuests.length))
    )
    setActiveGuestKey((current) =>
      current && serverGuests.some((guest) => guest.id === current)
        ? current
        : (serverGuests[0]?.id ?? null)
    )

    if ((activeOrder.channel ?? "DINE_IN") !== "DINE_IN") {
      setCustomerSex(serverGuests[0]?.sex ?? null)
      setCustomerAgeRange(serverGuests[0]?.ageRange ?? null)
    }
  }, [activeOrder, setChannel])
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    setPartySizeDraft(String(partySize))
  }, [partySize])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Cuentas que ya se vieron en esta pestaña: si una desaparece de la lista es
  // porque se cobró o canceló en otro dispositivo, no porque el refresh aún no
  // traiga la recién creada.
  const knownOrderIds = React.useRef(new Set<string>())

  React.useEffect(() => {
    for (const order of orders) knownOrderIds.current.add(order.id)
  }, [orders])

  React.useEffect(() => {
    if (!orderId) return
    if (orders.some((order) => order.id === orderId)) return
    if (!knownOrderIds.current.has(orderId)) return

    knownOrderIds.current.delete(orderId)
    draftsRef.current.delete(orderId)
    setOrderId("")
    setPendingOrder((current) => (current?.id === orderId ? null : current))
    setCart([])
    resetChannel()
    setTableNumber("1")
    setCustomerName("")
    setCustomerSex(null)
    setCustomerAgeRange(null)
    setCustomerPhone("")
    setDeliveryAddress("")
    setDeliveryFee("0")
    setGuests([{ key: newGuestKey(), name: "", savedName: "", sex: null, ageRange: null }])
    setPartySize(1)
    setPartySizeDraft("1")
    setActiveGuestKey(null)
    setPendingProductId(null)
    dismissComboNotice()
    setComboConflict(null)
  }, [orders, orderId, resetChannel])

  // Sin «General»: en mesa siempre hay un cliente activo. Si el cliente
  // seleccionado desaparece, se toma el primero de la lista. En mostrador no
  // se usan clientes: las líneas quedan sin `guestKey` (General interno).
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    setActiveGuestKey((current) => {
      if (!isDineIn || guests.length === 0) return null
      if (current && guests.some((guest) => guest.key === current)) {
        return current
      }

      return guests[0].key
    })
  }, [guests, isDineIn])
  /* eslint-enable react-hooks/set-state-in-effect */

  // En mesa no queda ninguna línea «General»: si una línea antigua o huérfana
  // no tiene cliente, pasa al primer cliente.
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    if (!isDineIn) return

    const fallbackGuestKey = guests[0]?.key
    if (!fallbackGuestKey) return
    if (!cart.some((line) => !line.guestKey)) return

    setCart((current) =>
      current.map((line) =>
        line.guestKey ? line : { ...line, guestKey: fallbackGuestKey }
      )
    )
  }, [cart, guests, isDineIn])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Publica el carrito en la pantalla de cliente (debounce corto).
  React.useEffect(() => {
    if (!displayId) return

    const timer = setTimeout(() => {
      if (cart.length > 0 && !displaySession.current) {
        displaySession.current = crypto.randomUUID()
      }

      const sessionKey =
        cart.length > 0 ? displaySession.current ?? "idle" : "idle"

      void fetch(`${API_BASE_URL}/pos/displays/${displayId}/state`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKey,
          items: cart.map((line) => ({
            name: line.variantName
              ? `${line.itemName} · ${line.variantName}`
              : line.itemName,
            quantity: line.quantity,
            price: line.unitPrice,
          })),
          total,
          customerName: customerName.trim() || undefined,
        }),
      }).catch(() => {
        // La pantalla es auxiliar: si falla no se interrumpe la venta.
      })
    }, 350)

    return () => clearTimeout(timer)
  }, [displayId, cart, total, customerName])

  // Lee la propina/confirmación que el cliente eligió en la pantalla.
  React.useEffect(() => {
    if (!displayId) return

    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/pos/displays/${displayId}/state`,
          { credentials: "include", cache: "no-store" }
        )

        if (!response.ok) return

        const state = (await response.json()) as PosDisplayState | null
        if (!cancelled) setDisplayState(state)
      } catch {
        // Silencioso: la caja sigue funcionando sin pantalla.
      }
    }

    void load()
    const timer = setInterval(() => void load(), 3000)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [displayId])

  React.useEffect(() => {
    return () => {
      if (comboUndoTimer.current) clearTimeout(comboUndoTimer.current)
    }
  }, [])

  function dismissComboNotice() {
    setComboNotice(null)
    setComboUndoAvailable(false)
    if (comboUndoTimer.current) clearTimeout(comboUndoTimer.current)
  }

  function showComboNotice(message: string, undo: () => void) {
    if (comboUndoTimer.current) clearTimeout(comboUndoTimer.current)

    setComboNotice({
      message,
      undo: () => {
        undo()
        dismissComboNotice()
      },
    })
    setComboUndoAvailable(true)
    comboUndoTimer.current = setTimeout(() => {
      setComboUndoAvailable(false)
    }, 3000)
  }

  function applyComboMatch(match: ComboMatch, previousCart: CartLine[]) {
    const nextCart = [
      ...consumeComponents(previousCart, match.consumption),
      match.line,
    ]
    setCart(nextCart)

    const restoredLines = match.consumption.flatMap((item) => {
      const original = previousCart.find((line) => line.key === item.key)
      return original ? [{ ...original, quantity: item.quantity }] : []
    })

    const difference = match.componentsTotal - match.comboPrice
    const message =
      difference > 0
        ? `Se aplicó el combo «${match.combo.name}»: ${money(
            match.comboPrice
          )} en lugar de ${money(match.componentsTotal)}.`
        : `Se aplicó el combo «${match.combo.name}» por ${money(
            match.comboPrice
          )}.`

    showComboNotice(message, () => {
      setCart((current) => {
        let next = current.filter((line) => line.key !== match.line.key)

        for (const restoredLine of restoredLines) {
          const existing = next.find((line) => line.key === restoredLine.key)

          if (existing) {
            next = next.map((line) =>
              line.key === restoredLine.key
                ? { ...line, quantity: line.quantity + restoredLine.quantity }
                : line
            )
          } else {
            next = [...next, restoredLine]
          }
        }

        return next
      })
    })
  }

  function runComboDetection(
    nextCart: CartLine[],
    trigger: { itemId: string; variantId?: string }
  ) {
    const matches = findComboMatches(nextCart, products, trigger)

    if (matches.length === 0) return
    if (matches.length === 1) {
      applyComboMatch(matches[0], nextCart)
      return
    }

    setComboConflict({ cart: nextCart, matches })
  }

  function chooseComboConflict(match: ComboMatch) {
    if (!comboConflict) return

    const previousCart = comboConflict.cart
    setComboConflict(null)
    applyComboMatch(match, previousCart)
  }

  const selectedMenu = menus.find((menu) => menu.id === menuId) ?? null

  // Orden y color de los grupos del menú elegido. El «Default» del POS sigue
  // el orden en que se guardaron las secciones y los artículos en el menú.
  const menuEntryByItem = React.useMemo(
    () =>
      new Map(
        (selectedMenu?.items ?? []).map((entry) => [entry.itemId, entry])
      ),
    [selectedMenu]
  )
  const groupRank = React.useMemo(
    () =>
      new Map(
        (selectedMenu?.groups ?? []).map((group, index) => [group, index])
      ),
    [selectedMenu]
  )

  /** Artículos del menú actual con alguna promoción activa. */
  const promotionItemIds = React.useMemo(() => {
    const ids = new Set<string>()

    for (const product of products) {
      if (!menuEntryByItem.has(product.id)) continue
      if (product.promotions?.some((promotion) => promotion.isActive)) {
        ids.add(product.id)
      }
    }

    return ids
  }, [products, menuEntryByItem])

  /**
   * Top 3 más vendido de cada grupo, según las ventas cobradas de los últimos
   * 30 días. Se calcula una vez por menú para que los chips y la grilla solo
   * consulten sets.
   */
  const trendingTopByGroup = React.useMemo(() => {
    const byGroup = new Map<string | null, Set<string>>()
    if (trendingItems.length === 0) return byGroup

    const quantityByItem = new Map(
      trendingItems.map((row) => [row.itemId, row.quantity])
    )
    const productIds = new Set(products.map((product) => product.id))

    const ranked = [...menuEntryByItem.keys()]
      .filter((itemId) => productIds.has(itemId))
      .map((itemId) => ({
        itemId,
        quantity: quantityByItem.get(itemId) ?? 0,
      }))
      .filter((row) => row.quantity > 0)
      .sort((left, right) => right.quantity - left.quantity)

    const counts = new Map<string | null, number>()

    for (const row of ranked) {
      const group = menuEntryByItem.get(row.itemId)?.group ?? null
      const count = counts.get(group) ?? 0
      if (count >= 3) continue

      const ids = byGroup.get(group) ?? new Set<string>()
      ids.add(row.itemId)
      byGroup.set(group, ids)
      counts.set(group, count + 1)
    }

    return byGroup
  }, [trendingItems, menuEntryByItem, products])

  const baseFiltered = React.useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase()

    const matches = products.filter((product) => {
      // El menú global contiene todo el catálogo: no hace falta filtrar.
      if (
        selectedMenu &&
        !selectedMenu.isGlobal &&
        !(product.menus ?? []).some(
          (menu) => menu.id === menuId && menu.isActive
        )
      ) {
        return false
      }
      if (!needle) return true
      return (
        product.name.toLowerCase().includes(needle) ||
        (product.sku ?? "").toLowerCase().includes(needle) ||
        (product.category?.name ?? "").toLowerCase().includes(needle) ||
        (product.optionGroups ?? []).some(
          (group) =>
            group.group.name.toLowerCase().includes(needle) ||
            group.values.some((value) =>
              itemOptionValueName(value).toLowerCase().includes(needle)
            )
        )
      )
    })

    if (sortOrder === "default") {
      if (!selectedMenu) return matches

      const ungroupedRank = selectedMenu.groups.length
      const missingRank = ungroupedRank + 1

      return [...matches].sort((left, right) => {
        const leftEntry = menuEntryByItem.get(left.id)
        const rightEntry = menuEntryByItem.get(right.id)
        const leftRank = leftEntry
          ? leftEntry.group
            ? (groupRank.get(leftEntry.group) ?? ungroupedRank)
            : ungroupedRank
          : missingRank
        const rightRank = rightEntry
          ? rightEntry.group
            ? (groupRank.get(rightEntry.group) ?? ungroupedRank)
            : ungroupedRank
          : missingRank

        return (
          leftRank - rightRank ||
          (leftEntry?.sortOrder ?? left.sortOrder) -
            (rightEntry?.sortOrder ?? right.sortOrder) ||
          PRODUCT_NAME_COLLATOR.compare(left.name, right.name)
        )
      })
    }

    const sorted = [...matches]

    switch (sortOrder) {
      case "az":
        sorted.sort((left, right) =>
          PRODUCT_NAME_COLLATOR.compare(left.name, right.name)
        )
        break
      case "za":
        sorted.sort((left, right) =>
          PRODUCT_NAME_COLLATOR.compare(right.name, left.name)
        )
        break
      case "price-asc":
        sorted.sort(
          (left, right) =>
            Number(left.price) - Number(right.price) ||
            PRODUCT_NAME_COLLATOR.compare(left.name, right.name)
        )
        break
      case "price-desc":
        sorted.sort(
          (left, right) =>
            Number(right.price) - Number(left.price) ||
            PRODUCT_NAME_COLLATOR.compare(left.name, right.name)
        )
        break
    }

    return sorted
  }, [
    products,
    deferredSearch,
    menuId,
    sortOrder,
    selectedMenu,
    menuEntryByItem,
    groupRank,
  ])

  const groupFilters = React.useMemo(() => {
    if (!selectedMenu) return []

    const present = new Set(
      selectedMenu.items.map((entry) => entry.group ?? null)
    )

    const filters: Array<{
      group: string | null
      label: string
      color: string | null
    }> = []

    // Mismo orden en que se guardaron los grupos del menú.
    for (const group of selectedMenu.groups) {
      if (!present.has(group)) continue

      filters.push({
        group,
        label: group,
        color: selectedMenu.groupColors?.[group] ?? null,
      })
    }

    if (present.has(null)) {
      filters.push({
        group: null,
        label: "Sin grupo",
        color: null,
      })
    }

    return filters
  }, [selectedMenu])

  // Una búsqueda sin resultados es señal de catálogo incompleto o de nombres
  // que no coinciden con lo que escribe el mesero.
  React.useEffect(() => {
    const query = deferredSearch.trim()

    if (!query || baseFiltered.length > 0) return

    posCapture.noteEmptySearch(query)
  }, [deferredSearch, baseFiltered])

  const selectedItemIds = React.useMemo(
    () =>
      new Set(
        cart
          .filter((line) => (line.guestKey ?? null) === activeGuestKey)
          .map((line) => line.itemId)
      ),
    [cart, activeGuestKey]
  )

  // Identidad estable para que el catálogo memoizado no se re-renderice
  // con cada cambio del carrito.
  const handleOpenProduct = React.useCallback((product: ItemListItem) => {
    posCapture.noteItemOpened(product.id)
    dialogOpenedAtRef.current = Date.now()
    dialogSavedRef.current = false
    setPendingProductId(product.id)
    setSelectedProduct(product)
  }, [])

  /** Limpia el buscador y cierra el evento de búsqueda en analítica. */
  const handleClearSearch = React.useCallback(() => {
    setSearch("")
    posCapture.endSearch()
  }, [])

  /**
   * Reemplaza las líneas del artículo para los clientes configurados en el
   * diálogo. Las presentaciones con cantidad 0 desaparecen; las demás se
   * crean o actualizan.
   */
  const applyItemOrder = (
    itemId: string,
    configurations: Array<{
      guestKey: string | null
      lines: Array<Omit<CartLine, "key">>
    }>
  ) => {
    if (configurations.length === 0) return

    const guestKeys = new Set(
      configurations.map((configuration) => configuration.guestKey)
    )
    const remaining = cart.filter(
      (line) =>
        !(line.itemId === itemId && guestKeys.has(line.guestKey ?? null))
    )
    const nextLines = configurations.flatMap((configuration) =>
      configuration.lines.map((line) => ({
        ...line,
        key: newCartKey(),
        guestKey: configuration.guestKey,
      }))
    )
    const nextCart = [...remaining, ...nextLines]
    setCart(nextCart)
    posCapture.noteCart(
      nextCart.reduce((total, line) => total + line.quantity, 0),
      nextCart.length,
      guests.length
    )

    const trigger = nextLines.find(isPlainLine)

    if (trigger) {
      runComboDetection(nextCart, {
        itemId: trigger.itemId,
        variantId: trigger.variantId,
      })
    }

    for (const line of nextLines) {
      const position = baseFiltered.findIndex(
        (product) => product.id === line.itemId
      )

      trackEvent({
        name: "pos.item_added",
        itemId: line.itemId,
        menuId: menuId || undefined,
        quantity: line.quantity,
        metadata: {
          position: position >= 0 ? position : null,
        },
      })
    }
  }

  /**
   * Abre el artículo de una línea del carrito para editar sus opciones.
   *
   * El diálogo trabaja por artículo y comensal, así que se activa el cliente de
   * la línea antes de abrirlo.
   */
  const openCartLineEditor = (line: CartLine) => {
    const item = products.find((candidate) => candidate.id === line.itemId)

    if (!item) {
      toast.info("El artículo ya no está en el catálogo")
      return
    }

    posCapture.noteItemOpened(item.id)
    dialogOpenedAtRef.current = Date.now()
    dialogSavedRef.current = false

    if (line.guestKey) setActiveGuestKey(line.guestKey)
    else setActiveGuestKey(null)

    setPendingProductId(item.id)
    setSelectedProduct(item)
  }

  const changeQuantity = (key: string, delta: number) => {
    const line = cart.find((candidate) => candidate.key === key)
    if (!line) return

    const quantity = line.quantity + delta
    const nextCart =
      quantity <= 0
        ? cart.filter((candidate) => candidate.key !== key)
        : cart.map((candidate) =>
            candidate.key === key ? { ...candidate, quantity } : candidate
          )

    setCart(nextCart)
    posCapture.noteCart(
      nextCart.reduce((total, line) => total + line.quantity, 0),
      nextCart.length,
      guests.length
    )

    if (delta > 0 && isPlainLine(line)) {
      runComboDetection(nextCart, {
        itemId: line.itemId,
        variantId: line.variantId,
      })
    }
  }

  const removeLine = (key: string) => {
    const nextCart = cart.filter((line) => line.key !== key)
    setCart(nextCart)
    posCapture.noteCart(
      nextCart.reduce((total, line) => total + line.quantity, 0),
      nextCart.length,
      guests.length
    )
  }

  /** Elimina una línea y ofrece deshacer desde el toast. */
  const removeLineWithUndo = (line: CartLine) => {
    const index = cart.findIndex((entry) => entry.key === line.key)
    if (index < 0) return

    removeLine(line.key)

    toast("Artículo eliminado", {
      description: line.itemName,
      duration: 6000,
      action: {
        label: "Deshacer",
        onClick: () => {
          const current = cartRef.current
          if (current.some((entry) => entry.key === line.key)) return

          const nextCart = [...current]
          nextCart.splice(Math.min(index, nextCart.length), 0, line)
          setCart(nextCart)
          posCapture.noteCart(
            nextCart.reduce((total, entry) => total + entry.quantity, 0),
            nextCart.length,
            guests.length
          )
        },
      },
    })
  }

  const selectOrder = (value: string) => {
    if (value === orderId) return

    // Guarda lo capturado en la comanda actual antes de cambiar. El borrador
    // de «Nueva cuenta» usa la clave vacía.
    draftsRef.current.set(orderId, {
      cart,
      channel,
      tableNumber,
      customerName,
      customerSex,
      customerAgeRange,
      customerPhone,
      deliveryAddress,
      deliveryFee,
      guests,
      partySize,
      partySizeDraft,
      activeGuestKey,
    })

    const items = cart.reduce((count, line) => count + line.quantity, 0)

    if (items > 0) {
      posCapture.finish("switched", {
        orderId,
        items,
        lines: cart.length,
        guests: guests.length,
        amount: total,
        channel,
      })
    } else {
      posCapture.discard()
    }

    setPendingProductId(null)
    setComboConflict(null)
    dismissComboNotice()

    const draft = draftsRef.current.get(value)

    setOrderId(value)
    setActiveGuestKey(draft?.activeGuestKey ?? null)

    if (draft) {
      // La comanda vuelve tal como se dejó: carrito, clientes y canal.
      restoringRef.current = value || "__new__"
      setCart(draft.cart)
      setChannel(draft.channel)
      setTableNumber(draft.tableNumber)
      setCustomerName(draft.customerName)
      setCustomerSex(draft.customerSex)
      setCustomerAgeRange(draft.customerAgeRange)
      setCustomerPhone(draft.customerPhone)
      setDeliveryAddress(draft.deliveryAddress)
      setDeliveryFee(draft.deliveryFee)
      setGuests(
        draft.guests.length > 0
          ? draft.guests
          : [{ key: newGuestKey(), name: "", savedName: "", sex: null, ageRange: null }]
      )
      setPartySize(Math.max(1, draft.partySize))
      setPartySizeDraft(draft.partySizeDraft)
      return
    }

    setCart([])

    if (!value) {
      setGuests([{ key: newGuestKey(), name: "", savedName: "", sex: null, ageRange: null }])
      setPartySize(1)
      resetChannel()
      setTableNumber("1")
      setCustomerName("")
      setCustomerSex(null)
      setCustomerAgeRange(null)
      setCustomerPhone("")
      setDeliveryAddress("")
      setDeliveryFee("0")
    }
  }

  /** Deja limpia la comanda nueva (borrador `""`). */
  function resetNewDraft() {
    draftsRef.current.delete("")
    posCapture.discard()
    setOrderId("")
    setCart([])
    setGuests([
      {
        key: newGuestKey(),
        name: "",
        savedName: "",
        sex: null,
        ageRange: null,
      },
    ])
    setPartySize(1)
    setPartySizeDraft("1")
    setActiveGuestKey(null)
    resetChannel()
    setTableNumber("1")
    setCustomerName("")
    setCustomerSex(null)
    setCustomerAgeRange(null)
    setCustomerPhone("")
    setDeliveryAddress("")
    setDeliveryFee("0")
    setPendingProductId(null)
    displaySession.current = null
    dismissComboNotice()
    setComboConflict(null)
  }

  /**
   * “Nueva” del POS móvil: pasa a la comanda nueva y abre el Sheet.
   *
   * Si la cuenta actual ya está guardada, su borrador queda en `draftsRef` y
   * se recupera al volver a seleccionarla desde Pendientes.
   */
  function startNewComanda() {
    posCapture.noteComandaInteraction()

    if (orderId) {
      selectOrder("")
    }

    setComandaOpen(true)
  }

  function handleNewComanda() {
    if (!orderId && comandaUnits > 0) {
      setConfirmNewComanda(true)
      return
    }

    startNewComanda()
  }

  function confirmStartNewComanda() {
    resetNewDraft()
    setConfirmNewComanda(false)
    setComandaOpen(true)
  }

  function openPendingOrder(id: string) {
    selectOrder(id)
    setPendingOpen(false)
    setComandaOpen(true)
  }

  // Atajos para moverse por la pila sin depender del gesto.
  useShortcut("pos.nextOrder", () => {
    const next = adjacentOrderId(deckOrders, orderId, 1)

    if (next !== null) selectOrder(next)
  })
  useShortcut("pos.previousOrder", () => {
    const previous = adjacentOrderId(deckOrders, orderId, -1)

    if (previous !== null) selectOrder(previous)
  })

  const handleSend = async () => {
    if (cart.length === 0) {
      toast.error("Añade al menos un artículo")
      return
    }

    if (channel === "DINE_IN" && !tableNumber.trim()) {
      toast.error("Escribe el número de mesa")
      return
    }

    if (
      (channel === "PHONE" || channel === "DELIVERY") &&
      !customerPhone.trim()
    ) {
      toast.error("Escribe el teléfono del cliente")
      return
    }

    if (channel === "DELIVERY" && !deliveryAddress.trim()) {
      toast.error("Escribe la dirección de entrega")
      return
    }

    const draftLabel =
      channel === "DINE_IN"
        ? tableNumber.trim()
          ? `Mesa ${tableNumber.trim()}`
          : "Sin mesa"
        : ORDER_CHANNEL_LABELS[channel]

    const items = cart.map(lineToInput)
    const cartItems = cart.reduce((count, line) => count + line.quantity, 0)
    const lineLabel = `${cart.length} línea${cart.length === 1 ? "" : "s"}`
    const label = orderId
      ? `${activeOrder ? orderLabel(activeOrder) : "Cuenta abierta"} · ${lineLabel}`
      : `${draftLabel} · ${lineLabel}`

    // Claves estables: si el envío falla por red después de que el servidor lo
    // procesó, el reintento devuelve la operación existente en vez de duplicar.
    const orderKey = crypto.randomUUID()
    const roundKey = crypto.randomUUID()

    const resetDraft = () => {
      setCart([])
      resetChannel()
      setTableNumber("1")
      setCustomerName("")
      setCustomerSex(null)
      setCustomerAgeRange(null)
      setCustomerPhone("")
      setDeliveryAddress("")
      setDeliveryFee("0")
      setGuests([{ key: newGuestKey(), name: "", savedName: "", sex: null, ageRange: null }])
      setPartySize(1)
      setActiveGuestKey(null)
      setPendingProductId(null)
      displaySession.current = null
      dismissComboNotice()
      setComboConflict(null)
    }

    // Guarda la comanda en IndexedDB. Nunca se anuncia como recibida por
    // cocina: eso solo ocurre cuando el servidor confirma el envío.
    const queueOffline = async (targetOrderId?: string) => {
      try {
        await offline.enqueueRound({
          orderId: targetOrderId,
          tableNumber:
            channel === "DINE_IN"
              ? tableNumber.trim() || undefined
              : undefined,
          isTakeaway: channel !== "DINE_IN",
          items,
          total,
          label,
          orderIdempotencyKey: orderKey,
          roundIdempotencyKey: roundKey,
        })
      } catch {
        // Si el dispositivo no puede guardar (IndexedDB bloqueada), la comanda
        // sigue en pantalla para no perderla.
        toast.error("No se pudo guardar la comanda en este dispositivo", {
          description: "Revisa el almacenamiento del navegador e inténtalo de nuevo.",
        })
        return
      }

      toast.success("Comanda guardada en este dispositivo", {
        description:
          "Se enviará al recuperar la conexión. Cocina todavía no la ha recibido.",
      })
      posCapture.finish("sent", {
        orderId: targetOrderId ?? orderId,
        items: cartItems,
        lines: cart.length,
        guests: guests.length,
        amount: total,
        channel,
        offline: true,
      })
      resetDraft()
    }

    if (!offline.isOnline) {
      await queueOffline()
      return
    }

    setSending(true)

    try {
      let targetId = orderId
      let createdGuests: OrderGuest[] = []

      if (!targetId) {
        const created = await createOrder({
          channel,
          tableNumber:
            channel === "DINE_IN"
              ? tableNumber.trim() || "1"
              : undefined,
          partySize: channel === "DINE_IN" ? partySize : 1,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          deliveryAddress:
            channel === "DELIVERY"
              ? deliveryAddress.trim() || undefined
              : undefined,
          deliveryFee:
            channel === "DELIVERY" ? Number(deliveryFee) || 0 : 0,
          guests:
            channel === "DINE_IN"
              ? guests.map((guest) => ({
                  name: guest.name.trim() || undefined,
                  sex: guest.sex,
                  ageRange: guest.ageRange,
                }))
              : customerName.trim() || customerSex || customerAgeRange
                ? [
                    {
                      name: customerName.trim() || undefined,
                      sex: customerSex,
                      ageRange: customerAgeRange,
                    },
                  ]
                : undefined,
          idempotencyKey: orderKey,
        })

        if (!created.ok || !created.data) {
          if (created.network) {
            await queueOffline()
            return
          }

          toast.error(created.message ?? "No se pudo abrir la cuenta")
          return
        }

        targetId = created.data.id
        createdGuests = created.data.guests ?? []
        setPendingOrder(created.data)
        setOrderId(targetId)
      }

      const createdGuestByKey = new Map(
        createdGuests.map((guest, index) => [guests[index]?.key, guest.id])
      )

      // Al crear la cuenta, las claves locales de los clientes pasan a ser ids
      // reales; así las siguientes rondas no envían claves inexistentes.
      if (createdGuests.length > 0) {
        const keyToId = new Map(
          guests.flatMap((guest, index) => {
            const created = createdGuests[index]

            return created ? [[guest.key, created.id] as const] : []
          })
        )

        setGuests(
          createdGuests.map((guest) => ({
            key: guest.id,
            id: guest.id,
            name: guest.name,
            savedName: guest.name,
            sex: guest.sex ?? null,
            ageRange: guest.ageRange ?? null,
          }))
        )
        setCart((current) =>
          current.map((line) => {
            const nextId = line.guestKey
              ? keyToId.get(line.guestKey)
              : undefined

            return nextId ? { ...line, guestKey: nextId } : line
          })
        )
        setActiveGuestKey((current) => (current && keyToId.get(current)) || null)
      }

      const knownGuestIds = new Set([
        ...(activeOrder?.guests ?? []).map((guest) => guest.id),
        ...createdGuests.map((guest) => guest.id),
      ])

      const itemsWithGuests = cart.map((line) => {
        const input = lineToInput(line)

        // En mostrador/teléfono/domicilio no se reparte por cliente.
        if (!line.guestKey || displayChannel !== "DINE_IN") return input

        // Nunca se envía una clave local (`guest-…`): si el cliente todavía no
        // existe en la cuenta, la línea va a General.
        const guestId =
          createdGuestByKey.get(line.guestKey) ??
          (knownGuestIds.has(line.guestKey) ? line.guestKey : null)

        return guestId ? { ...input, guestId } : input
      })

      const result = await sendRound(targetId, {
        items: itemsWithGuests,
        idempotencyKey: roundKey,
      })

      if (!result.ok) {
        if (result.network) {
          await queueOffline(targetId)
          return
        }

        toast.error(result.message ?? "No se pudo enviar la ronda")
        return
      }

      toast.success(`Ronda enviada · ${money(total)}`)

      const warnings = result.data?.warnings ?? []
      if (warnings.length > 0) {
        toast.warning(
          `Stock insuficiente: ${warnings.map((warning) => warning.name).join(", ")}`
        )
      }

      posCapture.finish("sent", {
        orderId: targetId,
        items: cartItems,
        lines: cart.length,
        guests: guests.length,
        amount: total,
        channel,
      })
      draftsRef.current.delete(targetId)
      draftsRef.current.delete("")
      resetDraft()
      router.refresh()
    } catch {
      if (!navigator.onLine) {
        await queueOffline(orderId || undefined)
      } else {
        toast.error("No se pudo enviar la ronda")
      }
    } finally {
      setSending(false)
    }
  }

  /** Etiqueta visible de un cliente según su posición. */
  const guestDisplayName = (guest: GuestDraft, index: number) =>
    guest.name.trim() || `Cliente ${index + 1}`

  /**
   * Unidades por cliente: lo que está en la comanda sin enviar y lo que ya
   * salió en rondas no canceladas.
   */
  const guestUnits = React.useMemo(() => {
    const units = new Map<string, number>()

    const add = (key: string | null | undefined, quantity: number) => {
      if (!key) return
      units.set(key, (units.get(key) ?? 0) + quantity)
    }

    for (const line of cart) add(line.guestKey, line.quantity)

    for (const round of activeOrder?.rounds ?? []) {
      if (round.status === "CANCELLED") continue
      if (!("items" in round)) continue

      for (const item of round.items) add(item.guestId, item.quantity)
    }

    return units
  }, [cart, activeOrder])

  const visibleCart = React.useMemo(
    () =>
      cart.filter((line) => (line.guestKey ?? null) === activeGuestKey),
    [cart, activeGuestKey]
  )

  const setGuestNameLocal = (guest: GuestDraft, name: string) => {
    posCapture.noteComandaActivity()
    setGuests((current) =>
      current.map((entry) =>
        entry.key === guest.key ? { ...entry, name } : entry
      )
    )
  }

  /** Selecciona el cliente activo y, si aplica, inicia la captura. */
  const selectGuest = (guestKey: string) => {
    posCapture.noteComandaInteraction()
    setActiveGuestKey(guestKey)
  }

  const updateGuest = async (
    guest: GuestDraft,
    changes: {
      name?: string
      sex?: GuestSex | null
      ageRange?: GuestAgeRange | null
    }
  ) => {
    posCapture.noteComandaInteraction()
    setGuests((current) =>
      current.map((entry) =>
        entry.key === guest.key ? { ...entry, ...changes } : entry
      )
    )

    if (!orderId || !guest.id) {
      if (changes.name !== undefined) {
        const savedName = changes.name

        setGuests((current) =>
          current.map((entry) =>
            entry.key === guest.key ? { ...entry, savedName } : entry
          )
        )
      }

      return
    }

    setGuestBusy(true)

    try {
      const result = await updateOrderGuest(orderId, guest.id, changes)

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo actualizar el cliente")
        router.refresh()
        return
      }

      if (changes.name !== undefined) {
        const savedName = changes.name

        setGuests((current) =>
          current.map((entry) =>
            entry.key === guest.key ? { ...entry, savedName } : entry
          )
        )
      }
    } finally {
      setGuestBusy(false)
    }
  }

  /** Ajusta el número de clientes y sincroniza los chips. */
  const changePartySize = async (next: number) => {
    const target = Math.min(20, Math.max(1, next))

    if (target === partySize) return

    posCapture.noteComandaInteraction()

    if (target > partySize) {
      const additions = target - partySize

      if (orderId) {
        setGuestBusy(true)

        try {
          for (let index = 0; index < additions; index += 1) {
            const result = await addOrderGuest(orderId, {})

            if (!result.ok || !result.data) {
              toast.error(result.message ?? "No se pudo añadir el cliente")
              break
            }

            const created = result.data

            setGuests((current) => [
              ...current,
              {
                key: created.id,
                id: created.id,
                name: created.name,
                savedName: created.name,
                sex: created.sex ?? null,
                ageRange: created.ageRange ?? null,
              },
            ])
          }

          router.refresh()
        } finally {
          setGuestBusy(false)
        }
      } else {
        setGuests((current) => [
          ...current,
          ...Array.from({ length: additions }, () => ({
            key: newGuestKey(),
            name: "",
            savedName: "",
            sex: null,
            ageRange: null,
          })),
        ])
      }

      setPartySize(target)
      return
    }

    const removals = partySize - target
    const removed = guests.slice(-removals)

    if (orderId) {
      setGuestBusy(true)

      try {
        for (const guest of removed) {
          if (!guest.id) continue

          const result = await removeOrderGuest(orderId, guest.id)

          if (!result.ok) {
            toast.error(result.message ?? "No se pudo quitar el cliente")
            break
          }
        }

        router.refresh()
      } finally {
        setGuestBusy(false)
      }
    }

    // Las líneas de los clientes eliminados pasan al primer cliente.
    const fallbackGuestKey = guests[0]?.key ?? null

    setCart((current) =>
      current.map((line) =>
        removed.some((guest) => guest.key === line.guestKey)
          ? { ...line, guestKey: fallbackGuestKey }
          : line
      )
    )

    setGuests((current) => current.slice(0, target))
    setPartySize(target)

    if (activeGuestKey && removed.some((guest) => guest.key === activeGuestKey)) {
      setActiveGuestKey(fallbackGuestKey)
    }
  }

  const requestRemoveGuest = (guest: GuestDraft) => {
    if (partySize <= 1) {
      toast.error("La mesa debe tener al menos un cliente")
      return
    }

    posCapture.noteComandaInteraction()
    setGuestRemoving(guest)
  }

  const applyGuestRemove = async () => {
    if (!guestRemoving) return

    setGuestBusy(true)

    try {
      if (orderId && guestRemoving.id) {
        const result = await removeOrderGuest(orderId, guestRemoving.id)

        if (!result.ok) {
          toast.error(result.message ?? "No se pudo quitar el cliente")
          return
        }

        router.refresh()
      }

      const removedKey = guestRemoving.key
      const fallbackGuestKey =
        guests.find((guest) => guest.key !== removedKey)?.key ?? null

      setCart((current) =>
        current.map((line) =>
          line.guestKey === removedKey
            ? { ...line, guestKey: fallbackGuestKey }
            : line
        )
      )
      setGuests((current) =>
        current.filter((guest) => guest.key !== removedKey)
      )
      setPartySize((current) => Math.max(1, current - 1))

      if (activeGuestKey === removedKey) setActiveGuestKey(fallbackGuestKey)

      setGuestRemoving(null)
    } finally {
      setGuestBusy(false)
    }
  }

  const comandaHeaderContent = (
    <>
                <CardTitle className="flex items-center gap-2">
                  <PencilLineIcon className="size-4" />
                  Comanda
                  {activeOrder?.ticketNumber ? (
                    <span className="rounded border px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                      {ticketCode(activeOrder.ticketNumber)}
                    </span>
                  ) : null}
                </CardTitle>
                {showComandaColumn ? (
                  <Select
                    value={orderId || "new"}
                    onValueChange={(value) =>
                      selectOrder(value === "new" ? "" : (value ?? ""))
                    }
                    items={[
                      { value: "new", label: "Nueva cuenta" },
                      ...selectOrders.map((order) => ({
                        value: order.id,
                        label: orderSelectLabel(order),
                      })),
                    ]}
                  >
                    <SelectTrigger className="w-44" aria-label="Cuentas">
                      <SelectValue placeholder="Nueva cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Nueva cuenta</SelectItem>
                      {selectOrders.map((order) => (
                        <SelectItem key={order.id} value={order.id}>
                          {orderSelectLabel(order)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <SheetClose
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Cerrar comanda"
                      />
                    }
                  >
                    <XIcon />
                  </SheetClose>
                )}
    </>
  )

  const comandaHeader = showComandaColumn ? (
    <CardHeader className="flex flex-row items-center justify-between gap-2 p-0">
      {comandaHeaderContent}
    </CardHeader>
  ) : (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
      {comandaHeaderContent}
    </div>
  )

  const comandaBody = (
    <>
                <div className="flex flex-wrap gap-1.5">
                  {CHANNELS.map((value) => {
                    const disabled =
                      value === "PHONE" ||
                      value === "DELIVERY" ||
                      Boolean(activeOrder)
                    const active = displayChannel === value

                    return (
                      <Button
                        key={value}
                        type="button"
                        variant="outline"
                        size="sm"
                        className={jalapenoChipClass(active)}
                        aria-pressed={active}
                        disabled={disabled}
                        title={
                          value === "PHONE" || value === "DELIVERY"
                            ? "Disponible próximamente"
                            : undefined
                        }
                        onClick={() => {
                          posCapture.noteComandaInteraction()
                          selectChannel(value)
                        }}
                      >
                        {ORDER_CHANNEL_LABELS[value]}
                      </Button>
                    )
                  })}
                </div>

                {isDineIn ? (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 items-end gap-2">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="pos-table">Mesa</Label>
                        <Select
                          value={activeOrder?.tableNumber ?? tableNumber}
                          onValueChange={(value) => {
                            posCapture.noteComandaInteraction()
                            setTableNumber(value ?? "1")
                          }}
                          disabled={Boolean(activeOrder)}
                          items={TABLE_OPTIONS.map((value) => ({
                            value,
                            label: `Mesa ${value}`,
                          }))}
                        >
                          <SelectTrigger id="pos-table" className="w-full" aria-label="Mesa">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TABLE_OPTIONS.map((value) => (
                              <SelectItem key={value} value={value}>
                                Mesa {value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label>Clientes</Label>
                        <ButtonGroup aria-label="Número de clientes" className="w-full">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label="Quitar un cliente"
                            disabled={partySize <= 1 || guestBusy}
                            onClick={() => void changePartySize(partySize - 1)}
                          >
                            <MinusIcon />
                          </Button>
                          <Input
                            aria-label="Número de clientes"
                            inputMode="numeric"
                            className="h-8 min-w-0 flex-1 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                            value={partySizeDraft}
                            onChange={(event) => {
                              posCapture.noteComandaActivity()
                              setPartySizeDraft(
                                event.target.value.replace(/\D/g, "").slice(0, 2)
                              )
                            }}
                            onBlur={() =>
                              void changePartySize(Number(partySizeDraft) || 1)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault()
                                event.currentTarget.blur()
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label="Añadir un cliente"
                            disabled={partySize >= 20 || guestBusy}
                            onClick={() => void changePartySize(partySize + 1)}
                          >
                            <PlusIcon />
                          </Button>
                        </ButtonGroup>
                      </div>
                    </div>

                    <fieldset className="min-w-0 rounded-lg border border-dashed px-2 pt-1 pb-2">
                      <legend className="px-1 text-[10px] font-medium text-muted-foreground">
                        Orden para
                      </legend>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {guests.map((guest, index) => (
                          <div key={guest.key} className="flex items-center">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={cn(
                                jalapenoChipClass(activeGuestKey === guest.key),
                                "max-w-40 rounded-r-none"
                              )}
                              aria-pressed={activeGuestKey === guest.key}
                              onClick={() => selectGuest(guest.key)}
                            >
                              {guestUnits.get(guest.key) ? (
                                <span
                                  aria-hidden
                                  className="size-2 shrink-0 rounded-full bg-primary"
                                />
                              ) : null}
                              <span className="truncate">
                                {guestDisplayName(guest, index)}
                              </span>
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="h-7 rounded-l-none rounded-r-full border border-destructive/40 px-2"
                              aria-label={`Quitar ${guestDisplayName(guest, index)}`}
                              disabled={partySize <= 1 || guestBusy}
                              onClick={() => requestRemoveGuest(guest)}
                            >
                              <XIcon className="size-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {activeGuest ? (
                        <div className="mt-2 flex flex-col gap-2 border-t pt-2">
                          <div className="flex items-end gap-2">
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                              <Label htmlFor="pos-guest-name" className="text-xs">
                                Nombre
                              </Label>
                              <GuestNameField
                                key={activeGuest.key}
                                guest={activeGuest}
                                placeholder={`Cliente ${
                                  guests.findIndex(
                                    (guest) => guest.key === activeGuest.key
                                  ) + 1
                                }`}
                                disabled={guestBusy}
                                onChange={(name) =>
                                  setGuestNameLocal(activeGuest, name)
                                }
                                onCommit={(name) =>
                                  void updateGuest(activeGuest, { name })
                                }
                              />
                            </div>

                            <GuestProfilePopover
                              sex={activeGuest.sex}
                              ageRange={activeGuest.ageRange}
                              disabled={guestBusy}
                              onChange={(changes) =>
                                void updateGuest(activeGuest, changes)
                              }
                            />
                          </div>
                        </div>
                      ) : null}
                    </fieldset>
                  </div>
                ) : null}

                {!activeOrder && !isDineIn && displayChannel === "COUNTER" ? (
                  <div className="flex items-end gap-2">
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <Label htmlFor="pos-customer">
                        Cliente{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          (opcional)
                        </span>
                      </Label>
                      <Input
                        id="pos-customer"
                        value={customerName}
                        onChange={(event) => {
                          posCapture.noteComandaActivity()
                          setCustomerName(event.target.value)
                        }}
                        maxLength={120}
                        placeholder="Nombre"
                      />
                    </div>
                    <GuestProfilePopover
                      sex={customerSex}
                      ageRange={customerAgeRange}
                      onChange={(changes) => {
                        posCapture.noteComandaInteraction()
                        if (changes.sex !== undefined) setCustomerSex(changes.sex)
                        if (changes.ageRange !== undefined) {
                          setCustomerAgeRange(changes.ageRange)
                        }
                      }}
                    />
                  </div>
                ) : null}

                {displays.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="pos-display">Pantalla de cliente</Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={displayId || "none"}
                        onValueChange={(value) =>
                          setDisplayId(value === "none" ? "" : (value ?? ""))
                        }
                        items={[
                          { value: "none", label: "Sin pantalla" },
                          ...displays.map((display) => ({
                            value: display.id,
                            label: display.name,
                          })),
                        ]}
                      >
                        <SelectTrigger id="pos-display" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin pantalla</SelectItem>
                          {displays.map((display) => (
                            <SelectItem key={display.id} value={display.id}>
                              {display.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {displayState?.confirmedAt ? (
                        <Badge variant="secondary">Confirmó</Badge>
                      ) : null}
                    </div>
                  </div>
                ) : null}

              {comboNotice ? (
                <Alert className="border-chart-3/50! bg-chart-3/10! text-chart-3!">
                  <SparklesIcon />
                  <AlertTitle>Precio de combo ajustado</AlertTitle>
                  <AlertDescription className="text-chart-3/80!">
                    {comboNotice.message}
                  </AlertDescription>
                  {comboUndoAvailable ? (
                    <AlertAction>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-chart-3 hover:bg-chart-3/15 hover:text-chart-3"
                        onClick={comboNotice.undo}
                      >
                        <Undo2Icon />
                        Revertir
                      </Button>
                    </AlertAction>
                  ) : null}
                </Alert>
              ) : null}

              {visibleCart.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {cart.length === 0
                    ? "Elige artículos del catálogo para armar la ronda."
                    : "Este cliente no tiene artículos en la comanda."}
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {visibleCart.map((line, index) => (
                    <li
                      key={line.key}
                      className={cn(
                        "flex flex-col gap-1",
                        index > 0 && "border-t border-dashed pt-2"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {line.itemName}
                            {line.variantName ? ` ${line.variantName}` : ""}
                          </p>
                          {line.extras.length > 0 ? (
                            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                              <span className="font-medium">Extras:</span>
                              {line.extras.map((extra) => (
                                <div
                                  key={extra.id}
                                  className="flex items-baseline justify-between gap-3"
                                >
                                  <span className="min-w-0 truncate">
                                    - {extra.name}
                                  </span>
                                  {extra.price !== 0 ? (
                                    <span className="shrink-0 tabular-nums">
                                      {extra.price > 0 ? "+" : "−"}
                                      {money(Math.abs(extra.price))}
                                    </span>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : null}
                          {groupCartOptions(line.options).map(
                            ([groupName, options]) => (
                              <div
                                key={groupName}
                                className="flex flex-col gap-0.5 text-xs text-muted-foreground"
                              >
                                <span className="font-medium">
                                  {groupName}:
                                </span>
                                {options.map((option) => (
                                  <div
                                    key={`${groupName}-${option.itemOptionValueId}`}
                                    className="flex items-baseline justify-between gap-3"
                                  >
                                    <span className="min-w-0 truncate">
                                      - {option.name}
                                    </span>
                                    {option.price !== 0 ? (
                                      <span className="shrink-0 tabular-nums">
                                        {option.price > 0 ? "+" : "−"}
                                        {money(Math.abs(option.price))}
                                      </span>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            )
                          )}
                          {line.excludedNames.length > 0 ? (
                            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                              <span className="font-medium">Sin:</span>
                              {line.excludedNames.map((name) => (
                                <span key={name} className="min-w-0 truncate">
                                  - {name}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {line.notes ? (
                            <p className="text-xs italic text-muted-foreground">
                              “{line.notes}”
                            </p>
                          ) : null}
                        </div>
                        <span className="text-sm font-medium tabular-nums">
                          {money(cartLineTotal(line))}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <ButtonGroup aria-label={`Cantidad de ${line.itemName}`}>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label={`Quitar una unidad de ${line.itemName}`}
                            onClick={() => changeQuantity(line.key, -1)}
                          >
                            <MinusIcon />
                          </Button>
                          <Input
                            aria-label={`Cantidad de ${line.itemName}`}
                            readOnly
                            tabIndex={-1}
                            value={line.quantity}
                            className="h-8 w-10 min-w-10 text-center text-sm tabular-nums"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label={`Añadir una unidad de ${line.itemName}`}
                            onClick={() => changeQuantity(line.key, 1)}
                          >
                            <PlusIcon />
                          </Button>
                        </ButtonGroup>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="ml-auto"
                          aria-label={`Editar opciones de ${line.itemName}`}
                          onClick={() => openCartLineEditor(line)}
                        >
                          <PencilLineIcon />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Quitar ${line.itemName} de la comanda`}
                          onClick={() => removeLineWithUndo(line)}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
    </>
  )

  const comandaSummary = (
    <>
      <div className="flex flex-col gap-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">
                    {money(taxBreakdown.subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">IVA</span>
                  <span className="tabular-nums">{money(taxBreakdown.tax)}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-1">
                  <span className="font-medium">Total</span>
                  <span className="text-base font-semibold tabular-nums">
                    {money(total)}
                  </span>
                </div>
              </div>

              {activeOrder ? (
                <>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Pagado {money(activeOrder.paidTotal ?? 0)}
                      {activeConfirmedCount > 0
                        ? ` · ${activeConfirmedCount} pago(s)`
                        : ""}
                    </span>
                    <span className="font-medium text-foreground tabular-nums">
                      Saldo {money(Math.max(Number(activeOrder.balance ?? 0), 0))}
                    </span>
                  </div>
                  {activePendingTotal > 0 ? (
                    <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400">
                      <span>Por confirmar</span>
                      <span className="font-medium tabular-nums">
                        {money(activePendingTotal)}
                      </span>
                    </div>
                  ) : null}
                </>
              ) : null}
    </>
  )

  const handlePrintAccount = async () => {
    if (!activeOrder) return

    if (cart.length > 0) {
      toast.info("Envía la comanda antes de imprimir la cuenta.", {
        description:
          "El ticket se genera con los artículos ya guardados en la cuenta.",
      })
      return
    }

    setPrintingAccount(true)

    try {
      const result = await printOrderReceipt(activeOrder.id)

      if (!result.ok || !result.data) {
        toast.error(result.message ?? "No se pudo imprimir la cuenta")
        return
      }

      toast.success("Ticket enviado a la terminal")
    } finally {
      setPrintingAccount(false)
    }
  }

  const hasConfirmedPayments = (activeOrder?.payments ?? []).some(
    (payment) => payment.status === "CONFIRMED"
  )
  const isTableServiceOrder =
    !activeOrder?.isTakeaway &&
    (activeOrder?.channel ?? "DINE_IN") === "DINE_IN"
  const canPrintAccount =
    Boolean(activeOrder) && (hasConfirmedPayments || isTableServiceOrder)

  const comandaActions = (
    <>
      {canSend ? (
                <>
                  <Button
                    onClick={handleSend}
                    disabled={sending || cart.length === 0}
                  >
                    {sending ? <Loader2Icon className="animate-spin" /> : null}
                    {offline.isOnline
                      ? orderId
                        ? "Enviar ronda"
                        : "Abrir cuenta y enviar"
                      : "Guardar comanda sin conexión"}
                  </Button>
                  {!offline.isOnline ? (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Cocina no recibirá la comanda hasta que vuelva la conexión.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Tu rol puede abrir cuentas, pero no enviar comandas a cocina.
                </p>
              )}

              <Can feature="pos.payments">
                {activeOrder && canRegister ? (
                  <>
                    <Button
                      variant="outline"
                      disabled={
                        !cash.session ||
                        cashClosePending ||
                        (!offline.isOnline && !canConfirm)
                      }
                      title={
                        !cash.session
                          ? "Abre la caja para cobrar"
                          : cashClosePending
                            ? "Cierre de caja pendiente de sincronizar"
                            : !offline.isOnline && !canConfirm
                              ? "Tu rol no puede confirmar pagos sin conexión"
                              : undefined
                      }
                      onClick={() => {
                        if (offlineCheckoutOrderIds.has(activeOrder.id)) {
                          toast.info(
                            "Ya hay un cobro guardado en este dispositivo para esta cuenta.",
                            {
                              description:
                                "Espera a que se sincronice o resuélvelo antes de cobrar de nuevo.",
                            }
                          )
                          return
                        }

                        if (offline.isOnline) setCharging(true)
                        else setOfflineCharging(true)
                      }}
                    >
                      {offline.isOnline ? <CreditCardIcon /> : <BanknoteIcon />}
                      {offline.isOnline
                        ? "Cobrar cuenta"
                        : "Cobrar sin conexión"}
                    </Button>
                    {canPrintAccount ? (
                      <Button
                        variant="ghost"
                        disabled={printingAccount || !offline.isOnline}
                        title={
                          !offline.isOnline
                            ? "Necesitas conexión para imprimir la cuenta"
                            : undefined
                        }
                        onClick={() => void handlePrintAccount()}
                      >
                        {printingAccount ? (
                          <Loader2Icon className="animate-spin" />
                        ) : (
                          <PrinterIcon />
                        )}
                        {hasConfirmedPayments
                          ? "Reimprimir ticket"
                          : "Imprimir cuenta"}
                      </Button>
                    ) : null}
                    {!cash.session ? (
                      <p className="text-xs text-muted-foreground">
                        Caja cerrada: caja o administración debe abrirla para
                        cobrar.
                      </p>
                    ) : cashClosePending ? (
                      <p className="text-xs text-muted-foreground">
                        La caja se cerró en este dispositivo; espera a
                        sincronizar antes de cobrar otra cuenta.
                      </p>
                    ) : !offline.isOnline ? (
                      <p className="text-xs text-muted-foreground">
                        {canConfirm
                          ? "Solo efectivo: el cobro se guarda y se envía al reconectar."
                          : "Sin conexión solo pueden cobrar roles autorizados a confirmar pagos."}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </Can>

              {!canDraft ? (
                <p className="text-xs text-muted-foreground">
                  No tienes permiso para abrir cuentas.
                </p>
              ) : null}
    </>
  )

  const comandaPanel = showComandaColumn ? (
    <OrderDeck orders={deckOrders} activeId={orderId} onSelect={selectOrder}>
      <Card className="flex flex-col gap-3 border p-4 ring-0">
        {comandaHeader}
        <CardContent className="flex flex-col gap-3 p-0">
          {comandaBody}
          <Separator />
          {comandaSummary}
          <PendingOperations />
          {comandaActions}
        </CardContent>
      </Card>
    </OrderDeck>
  ) : (
    <>
      {comandaHeader}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {comandaBody}
        <PendingOperations />
      </div>
      <div className="shrink-0 bg-card">
        <Separator />
        <div className="flex flex-col gap-3 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {comandaSummary}
          {comandaActions}
        </div>
      </div>
    </>
  )

  // Menú móvil de tres puntos: reúne los controles que en escritorio viven en
  // la fila superior (menú, orden, vista y caja) para no saturar la pantalla.
  const mobileToolsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            aria-label="Herramientas del punto de venta"
          />
        }
      >
        <MoreVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <NotebookTextIcon />
            Menú global
            <span className="ml-1.5 max-w-24 truncate text-xs font-normal text-muted-foreground">
              {selectedMenu?.name ?? ""}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-60">
            <DropdownMenuRadioGroup
              value={menuId}
              onValueChange={(value) => {
                const next = value ?? ""

                if (!next) return

                setMenuId(next)
                posCapture.noteFilter()
                trackEvent({
                  name: "pos.menu_filtered",
                  menuId: next,
                })
              }}
            >
              {menus.map((menu) => (
                <DropdownMenuRadioItem key={menu.id} value={menu.id}>
                  {menu.name}
                  {menu.isAvailableNow ? "" : " · fuera de horario"}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ArrowUpDownIcon />
            Ordenar
            <span className="ml-1.5 max-w-24 truncate text-xs font-normal text-muted-foreground">
              {
                SORT_OPTIONS.find((option) => option.value === sortOrder)
                  ?.label
              }
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-52">
            <DropdownMenuRadioGroup
              value={sortOrder}
              onValueChange={(value) =>
                setSortOrder(value as PosSortOrder)
              }
            >
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <LayoutGridIcon />
            Vista
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Ancho de tarjetas</DropdownMenuLabel>
              <DropdownMenuItem
                closeOnClick={false}
                disabled={cardColumns >= 7}
                onClick={() =>
                  setCardColumns((current) => Math.min(7, current + 1))
                }
              >
                <MinusIcon />
                Más angostas
              </DropdownMenuItem>
              <DropdownMenuItem
                closeOnClick={false}
                disabled={cardColumns <= 4}
                onClick={() =>
                  setCardColumns((current) => Math.max(4, current - 1))
                }
              >
                <PlusIcon />
                Más anchas
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuGroup>
              <DropdownMenuLabel>Tamaño del texto</DropdownMenuLabel>
              <DropdownMenuItem
                closeOnClick={false}
                disabled={cardTextSize <= 1}
                onClick={() =>
                  setCardTextSize((current) => Math.max(1, current - 1))
                }
              >
                <MinusIcon />
                Más pequeño
              </DropdownMenuItem>
              <DropdownMenuItem
                closeOnClick={false}
                disabled={cardTextSize >= 4}
                onClick={() =>
                  setCardTextSize((current) => Math.min(4, current + 1))
                }
              >
                <PlusIcon />
                Más grande
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuGroup>
              <DropdownMenuLabel>Altura de tarjetas</DropdownMenuLabel>
              <DropdownMenuItem
                closeOnClick={false}
                disabled={!squareCards}
                onClick={() => setSquareCards(false)}
              >
                <MinusIcon />
                Más bajas
              </DropdownMenuItem>
              <DropdownMenuItem
                closeOnClick={false}
                disabled={squareCards}
                onClick={() => setSquareCards(true)}
              >
                <PlusIcon />
                Más altas
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {canManageCash ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <WalletIcon />
              Caja
              <span className="ml-1.5 max-w-24 truncate text-xs font-normal text-muted-foreground">
                {cash.session ? "Abierta" : "Cerrada"}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              <DropdownMenuLabel>
                {cash.session ? "Caja abierta" : "Caja cerrada"}
              </DropdownMenuLabel>
              <DropdownMenuItem
                disabled={Boolean(cash.session)}
                onClick={() => setCashAction("open")}
              >
                <ReceiptTextIcon />
                Abrir caja
              </DropdownMenuItem>
              {cash.session ? (
                <DropdownMenuItem
                  disabled={cashClosePending}
                  onClick={() => setCashAction("close")}
                >
                  <LockIcon />
                  {cashClosePending ? "Cierre pendiente" : "Cerrar caja"}
                </DropdownMenuItem>
              ) : null}
              {cash.session ? (
                <DropdownMenuItem onClick={() => setCashAction("movement")}>
                  <ArrowDownToLineIcon />
                  Movimiento
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 pb-24 max-lg:landscape:pb-20 lg:px-6 xl:pb-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-3">
          {!showComandaColumn ? (
            <>
              <Card className="flex flex-col gap-3 border p-4 ring-0">
                <div className="comanda-rapida-mobile flex flex-col gap-2 rounded-lg">
              <div className="flex flex-wrap gap-1.5">
                {CHANNELS.map((value) => {
                  const disabled =
                    value === "PHONE" ||
                    value === "DELIVERY" ||
                    Boolean(activeOrder)
                  const active = displayChannel === value

                  return (
                    <Button
                      key={value}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={jalapenoChipClass(active)}
                      aria-pressed={active}
                      disabled={disabled}
                      title={
                        value === "PHONE" || value === "DELIVERY"
                          ? "Disponible próximamente"
                          : undefined
                      }
                      onClick={() => {
                        posCapture.noteComandaInteraction()
                        selectChannel(value)
                      }}
                    >
                      {ORDER_CHANNEL_LABELS[value]}
                    </Button>
                  )
                })}
              </div>

              {isDineIn ? (
                <>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                    <div className="flex flex-col gap-1">
                      <Label
                        htmlFor="mobile-pos-table"
                        className="text-xs text-muted-foreground"
                      >
                        Mesa
                      </Label>
                      <Select
                        value={activeOrder?.tableNumber ?? tableNumber}
                        onValueChange={(value) => {
                          posCapture.noteComandaInteraction()
                          setTableNumber(value ?? "1")
                        }}
                        disabled={Boolean(activeOrder)}
                        items={TABLE_OPTIONS.map((value) => ({
                          value,
                          label: `Mesa ${value}`,
                        }))}
                      >
                        <SelectTrigger
                          id="mobile-pos-table"
                          className="h-8 w-full"
                          aria-label="Mesa"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TABLE_OPTIONS.map((value) => (
                            <SelectItem key={value} value={value}>
                              Mesa {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <Label className="text-xs text-muted-foreground">
                        Clientes
                      </Label>
                      <ButtonGroup
                        aria-label="Número de clientes"
                        className="w-full"
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label="Quitar un cliente"
                          disabled={partySize <= 1 || guestBusy}
                          onClick={() => void changePartySize(partySize - 1)}
                        >
                          <MinusIcon />
                        </Button>
                        <Input
                          aria-label="Número de clientes"
                          inputMode="numeric"
                          className="h-8 w-10 min-w-0 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                          value={partySizeDraft}
                          onChange={(event) => {
                            posCapture.noteComandaActivity()
                            setPartySizeDraft(
                              event.target.value.replace(/\D/g, "").slice(0, 2)
                            )
                          }}
                          onBlur={() =>
                            void changePartySize(Number(partySizeDraft) || 1)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault()
                              event.currentTarget.blur()
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label="Añadir un cliente"
                          disabled={partySize >= 20 || guestBusy}
                          onClick={() => void changePartySize(partySize + 1)}
                        >
                          <PlusIcon />
                        </Button>
                      </ButtonGroup>
                    </div>
                  </div>

                  <div className="no-scrollbar -mx-4 -my-1 flex flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain px-4 py-1 lg:-mx-6 lg:px-6">
                    {guests.map((guest, index) => (
                      <div
                        key={guest.key}
                        className="flex shrink-0 items-center"
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(
                            jalapenoChipClass(activeGuestKey === guest.key),
                            "max-w-40 rounded-r-none"
                          )}
                          aria-pressed={activeGuestKey === guest.key}
                          onClick={() => selectGuest(guest.key)}
                        >
                          {guestUnits.get(guest.key) ? (
                            <span
                              aria-hidden
                              className="size-2 shrink-0 rounded-full bg-primary"
                            />
                          ) : null}
                          <span className="truncate">
                            {guestDisplayName(guest, index)}
                          </span>
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="h-7 rounded-l-none rounded-r-full border border-destructive/40 px-2"
                          aria-label={`Quitar ${guestDisplayName(guest, index)}`}
                          disabled={partySize <= 1 || guestBusy}
                          onClick={() => requestRemoveGuest(guest)}
                        >
                          <XIcon className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                      aria-label="Editar nombres"
                      onClick={() => setComandaOpen(true)}
                    >
                      <PencilLineIcon />
                    </Button>
                  </div>
                </>
              ) : displayChannel === "COUNTER" ? (
                activeOrder ? (
                  <p className="text-xs text-muted-foreground">
                    Cliente:{" "}
                    {activeOrder.customerName?.trim() || "Sin nombre"}
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    <Label
                      htmlFor="mobile-pos-customer"
                      className="text-xs text-muted-foreground"
                    >
                      Cliente (opcional)
                    </Label>
                    <Input
                      id="mobile-pos-customer"
                      value={customerName}
                      onChange={(event) => {
                        posCapture.noteComandaActivity()
                        setCustomerName(event.target.value)
                      }}
                      maxLength={120}
                      placeholder="Nombre"
                      className="h-8"
                    />
                  </div>
                )
              ) : null}

              {!isDineIn ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setComandaOpen(true)}
                  >
                    <PencilLineIcon />
                    Ver comanda
                  </Button>
                </div>
              ) : null}
                </div>
              </Card>
              <Separator />
            </>
          ) : null}

          <div className="filtros-mobile flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex min-w-0 items-center gap-2 sm:flex-1">
              <div className="relative min-w-0 flex-1 xl:w-56 xl:flex-none">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => {
                    const value = event.target.value
                    setSearch(value)
                    if (value.trim()) posCapture.noteSearch(value)
                    else posCapture.endSearch()
                  }}
                  placeholder="Buscar por nombre"
                  className="pl-8"
                  aria-label="Buscar por nombre, categoría o grupo"
                />
              </div>

              <div className="hidden xl:block">
                <Select
                  value={menuId}
                  onValueChange={(value) => {
                    const next = value ?? ""

                    if (!next) return

                    setMenuId(next)
                    posCapture.noteFilter()
                    trackEvent({
                      name: "pos.menu_filtered",
                      menuId: next,
                    })
                  }}
                  items={menus.map((menu) => ({
                    value: menu.id,
                    label: `${menu.name}${
                      menu.isAvailableNow ? "" : " · fuera de horario"
                    }`,
                  }))}
                >
                  <SelectTrigger
                    className="w-44"
                    aria-label="Filtrar por menú"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <NotebookTextIcon className="size-4 shrink-0 text-muted-foreground" />
                      <SelectValue placeholder="Menú" />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {menus.map((menu) => (
                      <SelectItem key={menu.id} value={menu.id}>
                        {menu.name}
                        {menu.isAvailableNow ? "" : " · fuera de horario"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="xl:hidden">{mobileToolsMenu}</div>
            </div>

            <div className="flex flex-wrap items-center gap-2 max-xl:hidden sm:ml-auto">
              <Popover>
                <PopoverTrigger
                  render={
                    <Button type="button" variant="outline" aria-label="Vista">
                      <LayoutGridIcon />
                      Vista
                    </Button>
                  }
                />
                <PopoverContent align="end" className="w-72">
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          Ancho de tarjetas
                        </span>
                        <ButtonGroup aria-label="Ancho de las tarjetas">
                          {/* «−» achica las tarjetas repartiendo más por fila; «+» las agranda. */}
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label="Tarjetas más pequeñas"
                            title="Tarjetas más pequeñas"
                            disabled={cardColumns >= 7}
                            onClick={() =>
                              setCardColumns((current) =>
                                Math.min(7, current + 1)
                              )
                            }
                          >
                            <MinusIcon className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label="Tarjetas más grandes"
                            title="Tarjetas más grandes"
                            disabled={cardColumns <= 4}
                            onClick={() =>
                              setCardColumns((current) =>
                                Math.max(4, current - 1)
                              )
                            }
                          >
                            <PlusIcon className="size-4" />
                          </Button>
                        </ButtonGroup>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          Tamaño del texto
                        </span>
                        <ButtonGroup aria-label="Tamaño del texto de las tarjetas">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label="Texto más pequeño"
                            title="Texto más pequeño"
                            disabled={cardTextSize <= 1}
                            onClick={() =>
                              setCardTextSize((current) =>
                                Math.max(1, current - 1)
                              )
                            }
                          >
                            <MinusIcon className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label="Texto más grande"
                            title="Texto más grande"
                            disabled={cardTextSize >= 4}
                            onClick={() =>
                              setCardTextSize((current) =>
                                Math.min(4, current + 1)
                              )
                            }
                          >
                            <PlusIcon className="size-4" />
                          </Button>
                        </ButtonGroup>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        Altura de tarjetas
                      </span>
                      <ButtonGroup aria-label="Altura de las tarjetas">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label="Tarjetas más bajas"
                          title="Tarjetas más bajas"
                          disabled={!squareCards}
                          onClick={() => setSquareCards(false)}
                        >
                          <MinusIcon className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label="Tarjetas más altas"
                          title="Tarjetas más altas"
                          disabled={squareCards}
                          onClick={() => setSquareCards(true)}
                        >
                          <PlusIcon className="size-4" />
                        </Button>
                      </ButtonGroup>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      aria-label="Ordenar artículos"
                    >
                      <ArrowUpDownIcon />
                      Ordenar
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={sortOrder}
                      onValueChange={(value) =>
                        setSortOrder(value as PosSortOrder)
                      }
                    >
                      {SORT_OPTIONS.map((option) => (
                        <DropdownMenuRadioItem
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {canManageCash ? (
                <div className="flex min-w-0 flex-1 xl:flex-none">
                  <CashSessionActions
                    session={cash.session}
                    summary={cash.summary}
                    canManage={canManageCash}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <PosCatalog
            key={menuId}
            products={baseFiltered}
            groupFilters={groupFilters}
            menuEntryByItem={menuEntryByItem}
            promotionItemIds={promotionItemIds}
            trendingTopByGroup={trendingTopByGroup}
            hasSearch={deferredSearch.trim().length > 0}
            onClearSearch={handleClearSearch}
            selectedItemIds={selectedItemIds}
            pendingProductId={pendingProductId}
            cardTextScale={cardTextScale}
            squareCards={squareCards}
            outOfScheduleMenuName={
              selectedMenu && !selectedMenu.isAvailableNow
                ? selectedMenu.name
                : null
            }
            onOpenProduct={handleOpenProduct}
          />
        </div>

                {showComandaColumn ? (
          <div className="hidden xl:sticky xl:top-4 xl:block">
            {comandaPanel}
          </div>
        ) : null}
      </div>

      {!showComandaColumn ? (
        <>
          <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex items-center justify-between px-3 max-lg:landscape:bottom-4 lg:bottom-6 xl:hidden">
            <button
              type="button"
              onClick={handleNewComanda}
              className="pointer-events-auto flex h-12 items-center gap-2 rounded-full border bg-card px-4 text-sm shadow-lg shadow-black/10 transition-transform focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:scale-[0.99]"
            >
              <PencilLineIcon className="size-5 text-primary" aria-hidden />
              <span className="font-medium">Nueva</span>
              {comandaUnits > 0 ? (
                <Badge variant="secondary" className="tabular-nums">
                  {comandaUnits}
                </Badge>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => setPendingOpen(true)}
              aria-label="Comandas pendientes"
              className="pointer-events-auto flex h-12 items-center gap-2 rounded-full border bg-card px-4 text-sm shadow-lg shadow-black/10 transition-transform focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:scale-[0.99]"
            >
              <NotebookTextIcon className="size-5 text-primary" aria-hidden />
              <span className="font-medium">Pendientes</span>
              {carouselOrders.length > 0 ? (
                <Badge variant="secondary" className="tabular-nums">
                  {carouselOrders.length}
                </Badge>
              ) : null}
            </button>
          </div>

          <Sheet open={pendingOpen} onOpenChange={setPendingOpen}>
            <SheetContent
              side="bottom"
              className="max-h-[80dvh] gap-0 overflow-hidden rounded-t-xl border-t p-0"
            >
              <div className="flex flex-col gap-3 p-4">
                <Carousel
                  opts={{ align: "start", containScroll: "trimSnaps" }}
                  className="w-full"
                >
                  <div className="pr-10">
                    <SheetTitle>Pendientes</SheetTitle>
                    <SheetDescription>
                      {carouselOrders.length === 1
                        ? "1 cuenta abierta"
                        : `${carouselOrders.length} cuentas abiertas`}
                    </SheetDescription>
                  </div>

                  {carouselOrders.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No hay comandas pendientes.
                    </p>
                  ) : (
                    <>
                      <CarouselContent className="-ml-2">
                        {carouselOrders.map((order) => (
                          <CarouselItem
                            key={order.id}
                            className="basis-[85%] pl-2"
                          >
                            <button
                              type="button"
                              onClick={() => openPendingOrder(order.id)}
                              aria-current={
                                order.id === orderId ? "true" : undefined
                              }
                              className={cn(
                                "flex w-full flex-col gap-2 rounded-xl border bg-card p-3 text-left transition-colors",
                                order.id === orderId
                                  ? "border-primary bg-primary/5"
                                  : "hover:bg-muted/50"
                              )}
                            >
                              <span className="flex items-start justify-between gap-2">
                                <span className="truncate text-sm font-medium">
                                  {orderSelectLabel(order)}
                                </span>
                                <span className="shrink-0 text-[11px] text-muted-foreground">
                                  {formatTime(order.createdAt)}
                                </span>
                              </span>
                              <span className="flex items-end justify-between gap-2">
                                <span className="min-w-0 truncate text-xs text-muted-foreground">
                                  {order.customerName?.trim() ||
                                    ORDER_CHANNEL_LABELS[
                                      order.channel ?? "DINE_IN"
                                    ]}
                                  {order.partySize > 1
                                    ? ` · ${order.partySize} clientes`
                                    : ""}
                                </span>
                                <span className="shrink-0 text-sm font-semibold tabular-nums">
                                  {money(Number(order.total))}
                                </span>
                              </span>
                            </button>
                          </CarouselItem>
                        ))}
                      </CarouselContent>

                      {carouselOrders.length > 1 ? (
                        <div className="mt-2 flex justify-end gap-1">
                          <CarouselPrevious className="relative! inset-auto!" />
                          <CarouselNext className="relative! inset-auto!" />
                        </div>
                      ) : null}
                    </>
                  )}
                </Carousel>
              </div>
            </SheetContent>
          </Sheet>

          <Sheet open={comandaOpen} onOpenChange={setComandaOpen}>
            <SheetContent
              side="bottom"
              showCloseButton={false}
              className="h-dvh! gap-0 overflow-hidden rounded-none border-0! p-0"
            >
              <SheetTitle className="sr-only">Comanda</SheetTitle>
              <SheetDescription className="sr-only">
                Revisa la cuenta y envía la ronda a cocina.
              </SheetDescription>
              {comandaPanel}
            </SheetContent>
          </Sheet>

          <AlertDialog
            open={confirmNewComanda}
            onOpenChange={setConfirmNewComanda}
          >
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogMedia className="bg-destructive/10 text-destructive">
                  <AlertTriangleIcon />
                </AlertDialogMedia>
                <AlertDialogTitle>
                  ¿Empezar una comanda nueva?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Tienes artículos sin guardar en esta comanda nueva. Se
                  perderán al empezar otra.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={confirmStartNewComanda}
                >
                  Empezar nueva
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}

      <AlertDialog
        open={comboConflict !== null}
        onOpenChange={(open) => {
          if (!open) setComboConflict(null)
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-chart-3/10 text-chart-3">
              <GroupIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Elige el combo correcto</AlertDialogTitle>
            <AlertDialogDescription>
              Los artículos agregados coinciden con más de un combo. Confirma
              cuál opción debe aplicarse.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-2">
            {comboConflict?.matches.map((match) => {
              const promotion = match.combo.promotions?.[0]

              return (
                <Button
                  key={match.combo.id}
                  type="button"
                  variant="outline"
                  className="h-auto justify-between gap-3 py-2 text-left"
                  onClick={() => chooseComboConflict(match)}
                >
                  <span className="flex min-w-0 flex-col items-start gap-0.5">
                    <span className="truncate font-medium">
                      {match.combo.name}
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {promotion?.isActive
                        ? PROMOTION_TYPE_LABELS[promotion.type]
                        : "Precio normal"}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {money(match.comboPrice)}
                  </span>
                </Button>
              )
            })}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedProduct ? (
        <AddItemDialog
          product={selectedProduct}
          guests={guests}
          activeGuestKey={activeGuestKey}
          splitByGuest={isDineIn}
          cart={cart}
          cardTextSize={cardTextScale}
          onSelectGuest={selectGuest}
          onValidationError={(group) =>
            posCapture.noteValidationError("required_option", group)
          }
          onClose={() => {
            if (!dialogSavedRef.current) {
              posCapture.noteDialogCancelled(
                selectedProduct.id,
                dialogOpenedAtRef.current === null
                  ? null
                  : Date.now() - dialogOpenedAtRef.current
              )
            }

            dialogOpenedAtRef.current = null
            dialogSavedRef.current = false
            setSelectedProduct(null)
            setPendingProductId(null)
          }}
          onSave={(configurations) => {
            dialogSavedRef.current = true
            dialogOpenedAtRef.current = null
            applyItemOrder(selectedProduct.id, configurations)
            setSelectedProduct(null)
            setPendingProductId(null)
          }}
        />
      ) : null}

      <AlertDialog
        open={Boolean(guestRemoving)}
        onOpenChange={(next) => !next && setGuestRemoving(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>
              Quitar a{" "}
              {guestRemoving
                ? guestDisplayName(
                    guestRemoving,
                    guests.findIndex(
                      (guest) => guest.key === guestRemoving.key
                    )
                  )
                : "este cliente"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Sus líneas se reasignan al primer cliente. Esta acción no
              borra los productos ya pedidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={guestBusy}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void applyGuestRemove()}
              disabled={guestBusy}
            >
              Quitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {charging && activeOrder ? (
        <ChargeDialog
          order={activeOrder}
          canConfirm={canConfirm}
          mercadoPago={mercadoPago}
          initialSummary={
            chargeSnapshot.current.get(chargeSummaryCacheKey(activeOrder)) ??
            null
          }
          displayTipPercent={displayState?.tipPercent ?? null}
          onClose={() => {
            setCharging(false)
            // Los cobros se reflejan en el diálogo sin revalidar el POS; al
            // cerrarlo se trae la lista de cuentas con los saldos reales.
            router.refresh()
          }}
          onClosed={() => {
            setCharging(false)
            setOrderId("")
            setCart([])
            setGuests([{ key: newGuestKey(), name: "", savedName: "", sex: null, ageRange: null }])
            setPartySize(1)
            setActiveGuestKey(null)
            setTableNumber("1")
            resetChannel()
            setCustomerName("")
            setCustomerSex(null)
            setCustomerAgeRange(null)
            setCustomerPhone("")
            setDeliveryAddress("")
            setDeliveryFee("0")
            setPendingProductId(null)
            dismissComboNotice()
            setComboConflict(null)
            router.refresh()
          }}
        />
      ) : null}

      {offlineCharging && activeOrder ? (
        <OfflineCheckoutDialog
          order={activeOrder}
          open
          onOpenChange={setOfflineCharging}
          onQueued={() => {
            setOfflineCharging(false)
            setOrderId("")
          }}
        />
      ) : null}

      <CashSessionDialog
        action={cashAction}
        onActionChange={setCashAction}
        session={cash.session}
        summary={cash.summary}
      />
    </div>
  )
}

function GuestProfilePopover({
  sex,
  ageRange,
  disabled,
  onChange,
}: {
  sex: GuestSex | null
  ageRange: GuestAgeRange | null
  disabled?: boolean
  onChange: (changes: {
    sex?: GuestSex | null
    ageRange?: GuestAgeRange | null
  }) => void
}) {
  const summary = [sex ? GUEST_SEX_LABELS[sex] : null, ageRange ? GUEST_AGE_RANGE_LABELS[ageRange] : null]
    .filter(Boolean)
    .join(" · ")

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" className="gap-1.5">
            <CakeIcon className="size-4" />
            {summary || "Edad"}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-72">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium">Sexo</span>
            <div className="flex flex-wrap gap-1">
              {GUEST_SEXES.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={jalapenoChipClass(sex === value)}
                  aria-pressed={sex === value}
                  disabled={disabled}
                  onClick={() => onChange({ sex: sex === value ? null : value })}
                >
                  {GUEST_SEX_LABELS[value]}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium">Rango de edad</span>
            <div className="flex flex-wrap gap-1">
              {GUEST_AGE_RANGES.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={jalapenoChipClass(ageRange === value)}
                  aria-pressed={ageRange === value}
                  disabled={disabled}
                  onClick={() =>
                    onChange({
                      ageRange: ageRange === value ? null : value,
                    })
                  }
                >
                  {GUEST_AGE_RANGE_LABELS[value]}
                </Button>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground">
            Datos opcionales para el servicio. No cambian el trato al cliente.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function GuestNameField({
  guest,
  placeholder,
  disabled,
  onChange,
  onCommit,
}: {
  guest: GuestDraft
  placeholder?: string
  disabled?: boolean
  onChange: (name: string) => void
  onCommit: (name: string) => void
}) {
  const [draft, setDraft] = React.useState(guest.name)

  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    setDraft(guest.name)
  }, [guest.name])
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <Input
      value={draft}
      disabled={disabled}
      maxLength={40}
      placeholder={placeholder ?? "Cliente"}
      onChange={(event) => {
        setDraft(event.target.value)
        onChange(event.target.value)
      }}
      onBlur={() => {
        const next = draft.trim()
        if (next !== guest.savedName) onCommit(next)
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          event.currentTarget.blur()
        }
      }}
    />
  )
}

const GENERAL_GUEST_KEY = "__general__"

/**
 * Una preparación del artículo con sus propias opciones.
 *
 * Por defecto todas las unidades comparten la configuración del comensal; al
 * personalizar, cada preparación puede tener variante, opciones, extras,
 * exclusiones y nota distintas. `quantity` agrupa unidades idénticas.
 */
interface Preparation {
  id: string
  variantId: string | null
  quantity: number
  selectedOptions: Record<string, string[]>
  extraIds: string[]
  excludedIds: string[]
  notes: string
}

interface GuestConfig {
  /** Cantidad por presentación elegida (modo compartido). */
  variantQuantities: Record<string, number>
  /** Cantidad cuando el artículo no tiene presentaciones (modo compartido). */
  quantity: number
  extraIds: string[]
  excludedIds: string[]
  selectedOptions: Record<string, string[]>
  notes: string
  /** El tab ya tenía líneas guardadas en la comanda. */
  hasLines: boolean
  /** Preparaciones con opciones distintas;
ull` = todas comparten. */
  preparations: Preparation[] | null
}

function newPreparationKey() {
  return `prep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function AddItemDialog({
  product,
  guests,
  activeGuestKey,
  splitByGuest,
  cart,
  cardTextSize,
  onSelectGuest,
  onValidationError,
  onClose,
  onSave,
}: {
  product: ItemListItem
  guests: GuestDraft[]
  activeGuestKey: string | null
  /** En mostrador y otros canales no se reparte el platillo por cliente. */
  splitByGuest: boolean
  cart: CartLine[]
  cardTextSize: ArticleCardTextSize
  /** Refleja en la comanda el cliente elegido en el diálogo. */
  onSelectGuest: (guestKey: string) => void
  /** Validación fallida antes de guardar (opción obligatoria, sin cantidad…). */
  onValidationError: (group: string) => void
  onClose: () => void
  onSave: (
    configurations: Array<{
      guestKey: string | null
      lines: Array<Omit<CartLine, "key">>
    }>
  ) => void
}) {
  const money = useMoney()
  const variants = product.variants.filter((variant) => variant.isActive)
  const extras = product.extras.filter((extra) => extra.isActive)
  const exclusions = product.ingredientExclusions ?? []
  const groups = (product.optionGroups ?? []).filter(
    (group) =>
      group.group &&
      group.values.some((value) => isItemOptionValueAvailable(value))
  )

  const emptySelectedOptions = () =>
    Object.fromEntries(
      groups.map((group) => {
        const available = group.values.filter(isItemOptionValueAvailable)

        if (group.selection === "MULTIPLE") {
          const max = Math.max(1, group.maxSelect ?? available.length)

          return [
            group.id,
            available
              .filter((value) => value.isDefault)
              .slice(0, max)
              .map((value) => value.id),
          ]
        }

        if (!group.isRequired && (group.minSelect ?? 0) <= 0) {
          return [group.id, []]
        }

        const preferred =
          available.find((value) => value.isDefault) ?? available[0]

        return [group.id, preferred ? [preferred.id] : []]
      })
    ) as Record<string, string[]>

  /** Opciones de una línea existente, en el formato del formulario. */
  const selectedFromLine = (line: CartLine) =>
    Object.fromEntries(
      groups.map((group) => [
        group.id,
        group.values
          .filter((value) =>
            line.options.some(
              (option) => option.itemOptionValueId === value.id
            )
          )
          .map((value) => value.id),
      ])
    ) as Record<string, string[]>

  /** Firma de una preparación: lo que la hace distinta de otra. */
  const prepSignature = (prep: {
    selectedOptions: Record<string, string[]>
    extraIds: string[]
    excludedIds: string[]
    notes: string
  }) =>
    [
      groups
        .map(
          (group) =>
            `${group.id}:${[...(prep.selectedOptions[group.id] ?? [])]
              .sort()
              .join(",")}`
        )
        .join("|"),
      [...prep.extraIds].sort().join(","),
      [...prep.excludedIds].sort().join(","),
      prep.notes.trim(),
    ].join("::")

  const configFromLines = (lines: CartLine[]): GuestConfig => {
    const variantQuantities: Record<string, number> = {}
    let quantity = 0

    for (const line of lines) {
      if (line.variantId) {
        variantQuantities[line.variantId] =
          (variantQuantities[line.variantId] ?? 0) + line.quantity
      } else {
        quantity += line.quantity
      }
    }

    const first = lines[0]
    const shared = {
      selectedOptions: first ? selectedFromLine(first) : emptySelectedOptions(),
      extraIds: first?.extras.map((extra) => extra.id) ?? [],
      excludedIds: first?.excludedIngredientIds ?? [],
      notes: first?.notes ?? "",
    }
    const sharedSignature = prepSignature(shared)

    // Si todas las líneas comparten configuración (salvo la presentación), se
    // siguen editando en bloque; si difieren, se reconstruyen por preparación.
    const homogeneous = lines.every(
      (line) =>
        prepSignature({
          selectedOptions: selectedFromLine(line),
          extraIds: line.extras.map((extra) => extra.id),
          excludedIds: line.excludedIngredientIds,
          notes: line.notes ?? "",
        }) === sharedSignature
    )

    return {
      variantQuantities,
      quantity,
      ...shared,
      hasLines: lines.length > 0,
      preparations:
        homogeneous || lines.length === 0
          ? null
          : lines.map((line) => ({
              id: newPreparationKey(),
              variantId: line.variantId ?? null,
              quantity: line.quantity,
              selectedOptions: selectedFromLine(line),
              extraIds: line.extras.map((extra) => extra.id),
              excludedIds: line.excludedIngredientIds,
              notes: line.notes ?? "",
            })),
    }
  }

  const [configs, setConfigs] = React.useState<Record<string, GuestConfig>>(
    () => {
      const entries: Record<string, GuestConfig> = {}
      const keys = splitByGuest
        ? guests.map((guest) => guest.key)
        : [GENERAL_GUEST_KEY]

      for (const key of keys) {
        const guestKey = key === GENERAL_GUEST_KEY ? null : key

        entries[key] = configFromLines(
          cart.filter(
            (line) =>
              line.itemId === product.id &&
              (line.guestKey ?? null) === guestKey
          )
        )
      }

      return entries
    }
  )
  const fallbackGuestKey = splitByGuest
    ? (guests[0]?.key ?? GENERAL_GUEST_KEY)
    : GENERAL_GUEST_KEY
  const [activeKey, setActiveKey] = React.useState<string>(() => {
    if (!splitByGuest) return GENERAL_GUEST_KEY
    if (activeGuestKey && guests.some((guest) => guest.key === activeGuestKey)) {
      return activeGuestKey
    }

    return fallbackGuestKey
  })

  const config =
    configs[activeKey] ?? configs[fallbackGuestKey] ?? configFromLines([])

  const updateConfig = (
    updater: (current: GuestConfig) => GuestConfig
  ) => {
    setConfigs((current) => {
      const currentConfig =
        current[activeKey] ?? current[fallbackGuestKey] ?? config
      return { ...current, [activeKey]: updater(currentConfig) }
    })
  }

  const [prepIndex, setPrepIndex] = React.useState(0)
  const [collapseOpen, setCollapseOpen] = React.useState(false)

  /** Preparaciones efectivas del comensal: compartidas o personalizadas. */
  const effectivePreparations = (candidate: GuestConfig): Preparation[] => {
    if (candidate.preparations) return candidate.preparations

    const shared = {
      selectedOptions: candidate.selectedOptions,
      extraIds: candidate.extraIds,
      excludedIds: candidate.excludedIds,
      notes: candidate.notes,
    }

    if (variants.length > 0) {
      return variants
        .filter((variant) => (candidate.variantQuantities[variant.id] ?? 0) > 0)
        .map((variant) => ({
          id: `shared-${variant.id}`,
          variantId: variant.id,
          quantity: candidate.variantQuantities[variant.id] ?? 0,
          ...shared,
        }))
    }

    return candidate.quantity > 0
      ? [
          {
            id: "shared",
            variantId: null,
            quantity: candidate.quantity,
            ...shared,
          },
        ]
      : []
  }

  const configQuantity = (candidate: GuestConfig) =>
    candidate.preparations
      ? candidate.preparations.reduce((sum, prep) => sum + prep.quantity, 0)
      : variants.length > 0
        ? variants.reduce(
            (sum, variant) =>
              sum + (candidate.variantQuantities[variant.id] ?? 0),
            0
          )
        : candidate.quantity

  const configHasContent = (candidate: GuestConfig) =>
    candidate.hasLines || configQuantity(candidate) > 0

  const variantCount = (candidate: GuestConfig, variantId: string) =>
    candidate.preparations
      ? candidate.preparations
          .filter((prep) => prep.variantId === variantId)
          .reduce((sum, prep) => sum + prep.quantity, 0)
      : (candidate.variantQuantities[variantId] ?? 0)

  const activePreparations = config.preparations
  const editingPrep =
    activePreparations && activePreparations.length > 0
      ? activePreparations[Math.min(prepIndex, activePreparations.length - 1)]
      : null

  /** Campos que edita el formulario: la preparación activa o los compartidos. */
  const editing = {
    selectedOptions: editingPrep?.selectedOptions ?? config.selectedOptions,
    extraIds: editingPrep?.extraIds ?? config.extraIds,
    excludedIds: editingPrep?.excludedIds ?? config.excludedIds,
    notes: editingPrep?.notes ?? config.notes,
  }

  const updateEditing = (
    updater: (current: {
      selectedOptions: Record<string, string[]>
      extraIds: string[]
      excludedIds: string[]
      notes: string
    }) => {
      selectedOptions: Record<string, string[]>
      extraIds: string[]
      excludedIds: string[]
      notes: string
    }
  ) => {
    updateConfig((current) => {
      const preps = current.preparations

      if (!preps || preps.length === 0) {
        return {
          ...current,
          ...updater({
            selectedOptions: current.selectedOptions,
            extraIds: current.extraIds,
            excludedIds: current.excludedIds,
            notes: current.notes,
          }),
        }
      }

      const index = Math.min(prepIndex, preps.length - 1)

      return {
        ...current,
        preparations: preps.map((prep, position) =>
          position === index ? { ...prep, ...updater(prep) } : prep
        ),
      }
    })
  }

  const templatePreparation = (
    candidate: GuestConfig,
    variantId: string | null
  ): Preparation => ({
    id: newPreparationKey(),
    variantId,
    quantity: 1,
    selectedOptions: { ...candidate.selectedOptions },
    extraIds: [...candidate.extraIds],
    excludedIds: [...candidate.excludedIds],
    notes: candidate.notes,
  })

  /** Convierte la configuración compartida en una preparación por unidad. */
  const personalize = () => {
    updateConfig((current) => {
      if (current.preparations) return current

      const preparations =
        variants.length > 0
          ? variants.flatMap((variant) =>
              Array.from(
                { length: current.variantQuantities[variant.id] ?? 0 },
                () => templatePreparation(current, variant.id)
              )
            )
          : Array.from({ length: current.quantity }, () =>
              templatePreparation(current, null)
            )

      return { ...current, preparations }
    })
    setPrepIndex(0)
  }

  const addPreparation = (variantId: string | null = null) => {
    updateConfig((current) => {
      if (!current.preparations) return current
      if (current.preparations.length >= 99) return current

      // La nueva preparación parte de la que se está editando.
      const index = Math.min(prepIndex, current.preparations.length - 1)
      const source = current.preparations[index]

      const preparation: Preparation = source
        ? {
            id: newPreparationKey(),
            variantId,
            quantity: 1,
            selectedOptions: { ...source.selectedOptions },
            extraIds: [...source.extraIds],
            excludedIds: [...source.excludedIds],
            notes: source.notes,
          }
        : templatePreparation(current, variantId)

      return {
        ...current,
        preparations: [...current.preparations, preparation],
      }
    })
  }

  const updatePreparation = (
    index: number,
    updater: (prep: Preparation) => Preparation
  ) => {
    updateConfig((current) => {
      if (!current.preparations) return current

      return {
        ...current,
        preparations: current.preparations.map((prep, position) =>
          position === index ? updater(prep) : prep
        ),
      }
    })
  }

  const removePreparation = (index: number) => {
    updateConfig((current) => {
      if (!current.preparations) return current

      const preparations = current.preparations.filter(
        (_, position) => position !== index
      )

      return preparations.length > 0
        ? { ...current, preparations }
        : {
            ...current,
            preparations: null,
            quantity: 0,
            variantQuantities: {},
          }
    })
    setPrepIndex(0)
  }

  const duplicatePreparation = (index: number) => {
    updateConfig((current) => {
      if (!current.preparations) return current

      const source = current.preparations[index]
      if (!source) return current

      return {
        ...current,
        preparations: [
          ...current.preparations,
          {
            ...source,
            id: newPreparationKey(),
            selectedOptions: { ...source.selectedOptions },
            extraIds: [...source.extraIds],
            excludedIds: [...source.excludedIds],
          },
        ],
      }
    })
  }

  const applyPreparationToAll = () => {
    updateConfig((current) => {
      if (!current.preparations || current.preparations.length === 0) {
        return current
      }

      const index = Math.min(prepIndex, current.preparations.length - 1)
      const source = current.preparations[index]

      return {
        ...current,
        preparations: current.preparations.map((prep) => ({
          ...prep,
          selectedOptions: { ...source.selectedOptions },
          extraIds: [...source.extraIds],
          excludedIds: [...source.excludedIds],
          notes: source.notes,
        })),
      }
    })
  }

  const decrementVariantUnit = (variantId: string | null) => {
    updateConfig((current) => {
      if (!current.preparations) return current

      const positions = current.preparations
        .map((prep, position) => ({ prep, position }))
        .filter((entry) => entry.prep.variantId === variantId)

      const last = positions[positions.length - 1]
      if (!last) return current

      if (last.prep.quantity > 1) {
        return {
          ...current,
          preparations: current.preparations.map((prep, position) =>
            position === last.position
              ? { ...prep, quantity: prep.quantity - 1 }
              : prep
          ),
        }
      }

      const preparations = current.preparations.filter(
        (_, position) => position !== last.position
      )

      return preparations.length > 0 ? { ...current, preparations } : current
    })
  }

  const changeVariantQuantity = (variantId: string, delta: number) => {
    if (config.preparations) {
      if (delta > 0) addPreparation(variantId)
      else decrementVariantUnit(variantId)
      return
    }

    updateConfig((current) => ({
      ...current,
      variantQuantities: {
        ...current.variantQuantities,
        [variantId]: Math.min(
          99,
          Math.max(0, (current.variantQuantities[variantId] ?? 0) + delta)
        ),
      },
    }))
  }

  const toggleVariant = (variantId: string) => {
    changeVariantQuantity(variantId, variantCount(config, variantId) === 1 ? -1 : 1)
  }

  const changeSimpleQuantity = (delta: number) => {
    if (config.preparations) {
      if (delta > 0) addPreparation(null)
      else decrementVariantUnit(null)
      return
    }

    updateConfig((current) => ({
      ...current,
      quantity: Math.min(99, Math.max(0, current.quantity + delta)),
    }))
  }

  const setEditingVariant = (variantId: string) => {
    updateConfig((current) => {
      if (!current.preparations || current.preparations.length === 0) {
        return current
      }

      const index = Math.min(prepIndex, current.preparations.length - 1)

      return {
        ...current,
        preparations: current.preparations.map((prep, position) =>
          position === index ? { ...prep, variantId } : prep
        ),
      }
    })
  }

  const preparationsHomogeneous = (candidate: GuestConfig) =>
    !candidate.preparations ||
    new Set(candidate.preparations.map((prep) => prepSignature(prep))).size <= 1

  const applyCollapse = () => {
    updateConfig((current) => {
      if (!current.preparations || current.preparations.length === 0) {
        return current
      }

      const variantQuantities: Record<string, number> = {}
      let quantity = 0

      for (const prep of current.preparations) {
        if (prep.variantId) {
          variantQuantities[prep.variantId] =
            (variantQuantities[prep.variantId] ?? 0) + prep.quantity
        } else {
          quantity += prep.quantity
        }
      }

      const first = current.preparations[0]

      return {
        ...current,
        preparations: null,
        variantQuantities,
        quantity,
        selectedOptions: { ...first.selectedOptions },
        extraIds: [...first.extraIds],
        excludedIds: [...first.excludedIds],
        notes: first.notes,
      }
    })
    setPrepIndex(0)
    setCollapseOpen(false)
  }

  const collapsePreparations = () => {
    if (!config.preparations) return

    if (!preparationsHomogeneous(config)) {
      setCollapseOpen(true)
      return
    }

    applyCollapse()
  }

  function chooseOption(
    groupId: string,
    valueId: string,
    multiple: boolean,
    required: boolean
  ) {
    updateEditing((current) => {
      const ids = current.selectedOptions[groupId] ?? []

      if (multiple) {
        return {
          ...current,
          selectedOptions: {
            ...current.selectedOptions,
            [groupId]: ids.includes(valueId)
              ? ids.filter((id) => id !== valueId)
              : [...ids, valueId],
          },
        }
      }

      if (!required && ids.includes(valueId)) {
        return {
          ...current,
          selectedOptions: { ...current.selectedOptions, [groupId]: [] },
        }
      }

      return {
        ...current,
        selectedOptions: { ...current.selectedOptions, [groupId]: [valueId] },
      }
    })
  }

  const toggleExtra = (extraId: string) => {
    updateEditing((current) => ({
      ...current,
      extraIds: current.extraIds.includes(extraId)
        ? current.extraIds.filter((id) => id !== extraId)
        : [...current.extraIds, extraId],
    }))
  }

  const toggleExclusion = (ingredientId: string) => {
    updateEditing((current) => ({
      ...current,
      excludedIds: current.excludedIds.includes(ingredientId)
        ? current.excludedIds.filter((id) => id !== ingredientId)
        : [...current.excludedIds, ingredientId],
    }))
  }

  const preparationPrice = (prep: Preparation) => {
    const variant = prep.variantId
      ? variants.find((candidate) => candidate.id === prep.variantId)
      : null
    const prepExtras = extras.filter((extra) =>
      prep.extraIds.includes(extra.id)
    )
    const optionsTotal = groups.flatMap((group) =>
      group.values
        .filter((value) => prep.selectedOptions[group.id]?.includes(value.id))
        .map((value) => Number(value.priceDelta))
    )

    return (
      Number(product.price) +
      prepExtras.reduce((sum, extra) => sum + Number(extra.price), 0) +
      optionsTotal.reduce((sum, price) => sum + price, 0) +
      Number(variant?.priceAdjust ?? 0)
    )
  }

  const total = effectivePreparations(config).reduce(
    (sum, prep) => sum + prep.quantity * preparationPrice(prep),
    0
  )

  const save = () => {
    for (const [key, candidate] of Object.entries(configs)) {
      const preparations = effectivePreparations(candidate)

      // Un tab que se vació solo elimina sus líneas; no exige opciones.
      if (preparations.length === 0) continue

      for (const [index, prep] of preparations.entries()) {
        const missing = groups.find((group) => {
          const min = group.isRequired
            ? Math.max(1, group.minSelect ?? 1)
            : Math.max(0, group.minSelect ?? 0)

          return (
            min > 0 && (prep.selectedOptions[group.id]?.length ?? 0) < min
          )
        })

        if (missing) {
          setActiveKey(key)
          if (candidate.preparations) setPrepIndex(index)
          onValidationError(missing.group.name)

          const min = Math.max(1, missing.minSelect ?? 1)
          toast.error(
            min > 1
              ? `Elige al menos ${min} opciones de ${missing.group.name}`
              : `Elige ${missing.group.name}`
          )
          return
        }
      }
    }

    const configurations: Array<{
      guestKey: string | null
      lines: Array<Omit<CartLine, "key">>
    }> = []

    for (const [key, candidate] of Object.entries(configs)) {
      const guestKey = key === GENERAL_GUEST_KEY ? null : key
      const preparations = effectivePreparations(candidate)

      if (preparations.length === 0 && !candidate.hasLines) continue

      // Las preparaciones idénticas se agrupan en un solo renglón.
      const grouped = new Map<
        string,
        {
          variantId: string | null
          quantity: number
          selectedOptions: Record<string, string[]>
          extraIds: string[]
          excludedIds: string[]
          notes: string
        }
      >()

      for (const prep of preparations) {
        const signature = `${prep.variantId ?? "none"}::${prepSignature(prep)}`
        const existing = grouped.get(signature)

        if (existing) {
          existing.quantity += prep.quantity
        } else {
          grouped.set(signature, {
            variantId: prep.variantId,
            quantity: prep.quantity,
            selectedOptions: prep.selectedOptions,
            extraIds: prep.extraIds,
            excludedIds: prep.excludedIds,
            notes: prep.notes,
          })
        }
      }

      const lines: Array<Omit<CartLine, "key">> = []

      for (const prep of grouped.values()) {
        const variant = prep.variantId
          ? variants.find((candidate) => candidate.id === prep.variantId)
          : null
        const prepExtras = extras.filter((extra) =>
          prep.extraIds.includes(extra.id)
        )
        const prepOptions = groups.flatMap((group) =>
          group.values
            .filter((value) =>
              prep.selectedOptions[group.id]?.includes(value.id)
            )
            .map((value) => ({
              itemOptionValueId: value.id,
              groupName: group.group.name,
              name: itemOptionValueName(value),
              price: Number(value.priceDelta),
            }))
        )
        const unitPrice =
          Number(product.price) +
          prepExtras.reduce((sum, extra) => sum + Number(extra.price), 0) +
          prepOptions.reduce((sum, option) => sum + option.price, 0) +
          Number(variant?.priceAdjust ?? 0)

        lines.push({
          itemId: product.id,
          itemName: product.name,
          variantId: variant?.id,
          variantName: variant?.name,
          unitPrice,
          quantity: prep.quantity,
          notes: prep.notes.trim() || undefined,
          extras: prepExtras.map((extra) => ({
            id: extra.id,
            name: extra.name,
            price: Number(extra.price),
          })),
          options: prepOptions,
          excludedIngredientIds: prep.excludedIds,
          excludedNames: exclusions
            .filter((exclusion) =>
              prep.excludedIds.includes(exclusion.ingredient.id)
            )
            .map((exclusion) => exclusion.ingredient.name),
        })
      }

      configurations.push({ guestKey, lines })
    }

    if (configurations.length === 0) {
      onValidationError("empty")
      toast.info("Sin cambios")
      onClose()
      return
    }

    onSave(configurations)
  }

  const hasExistingLines = Object.values(configs).some(
    (candidate) => candidate.hasLines
  )

  const tabs = splitByGuest
    ? guests.map((guest, index) => ({
        key: guest.key,
        label: guest.name.trim() || `Cliente ${index + 1}`,
      }))
    : []

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          mobile="full"
          className="max-h-[92dvh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-lg"
        >
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          {product.description ? (
            <p className="text-sm text-muted-foreground">
              {product.description}
            </p>
          ) : null}
        </DialogHeader>

        <div className="@container flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
          {splitByGuest ? (
            <fieldset className="min-w-0 rounded-lg border border-dashed px-2 pt-1 pb-2">
              <legend className="px-1 text-[10px] font-medium text-muted-foreground">
                Orden para
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {tabs.map((tab) => {
                  const candidate = configs[tab.key]
                  const active = activeKey === tab.key
                  const hasContent = candidate
                    ? configHasContent(candidate)
                    : false

                  return (
                    <Button
                      key={tab.key}
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-pressed={active}
                      className={jalapenoChipClass(active)}
                      onClick={() => {
                        setActiveKey(tab.key)
                        setPrepIndex(0)
                        onSelectGuest(tab.key)
                      }}
                    >
                      {tab.label}
                      {hasContent ? (
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            active ? "bg-chart-2" : "bg-muted-foreground"
                          )}
                        />
                      ) : null}
                    </Button>
                  )
                })}
              </div>
            </fieldset>
          ) : null}

          {variants.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 @sm:grid-cols-3">
              {variants.map((candidate) => {
                const count = variantCount(config, candidate.id)
                const selected = count > 0
                const candidatePrice =
                  Number(product.price) + Number(candidate.priceAdjust)

                return (
                  <div
                    key={candidate.id}
                    className={cn(
                      "flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow",
                      selected && "ring-2 ring-primary"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleVariant(candidate.id)}
                      aria-pressed={selected}
                      aria-label={`Elegir ${candidate.name}`}
                      className="block w-full text-left focus-visible:outline-none"
                    >
                      <ArticleCardVisual
                        name={candidate.name}
                        price={money(candidatePrice)}
                        imageUrl={candidate.imageUrl ?? product.imageUrl}
                        imageVariants={
                          candidate.imageVariants ?? product.imageVariants
                        }
                        selected={false}
                        compact
                        textSize={cardTextSize}
                        className="rounded-none! border-0!"
                        badge={
                          candidate.isPrimary ? (
                            <Badge
                              variant="outline"
                              size="sm"
                              className="border-white/35 bg-black/35 text-[10px] text-white backdrop-blur-sm"
                            >
                              Principal
                            </Badge>
                          ) : null
                        }
                      />
                    </button>

                    <div className="flex items-center justify-between gap-1 border-t px-1.5 py-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Quitar una unidad de ${candidate.name}`}
                        disabled={count <= 0}
                        onClick={() =>
                          changeVariantQuantity(candidate.id, -1)
                        }
                      >
                        <MinusIcon />
                      </Button>
                      <span className="min-w-6 text-center text-sm tabular-nums">
                        {count}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Añadir una unidad de ${candidate.name}`}
                        onClick={() =>
                          changeVariantQuantity(candidate.id, 1)
                        }
                      >
                        <PlusIcon />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 @sm:grid-cols-3">
              <div
                className={cn(
                  "flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow",
                  configQuantity(config) > 0 && "ring-2 ring-primary"
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (config.preparations) return

                    updateConfig((current) => ({
                      ...current,
                      quantity:
                        current.quantity === 1
                          ? 0
                          : current.quantity === 0
                            ? 1
                            : current.quantity,
                    }))
                  }}
                  aria-pressed={configQuantity(config) > 0}
                  aria-label={`Elegir ${product.name}`}
                  className="block w-full text-left focus-visible:outline-none"
                >
                  <ArticleCardVisual
                    name={product.name}
                    price={money(Number(product.price))}
                    imageUrl={product.imageUrl}
                    imageVariants={product.imageVariants}
                    selected={false}
                    compact
                    textSize={cardTextSize}
                    className="rounded-none! border-0!"
                  />
                </button>

                <div className="flex items-center justify-between gap-1 border-t px-1.5 py-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Quitar una unidad de ${product.name}`}
                    disabled={configQuantity(config) <= 0}
                    onClick={() => changeSimpleQuantity(-1)}
                  >
                    <MinusIcon />
                  </Button>
                  <span className="min-w-6 text-center text-sm tabular-nums">
                    {configQuantity(config)}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Añadir una unidad de ${product.name}`}
                    onClick={() => changeSimpleQuantity(1)}
                  >
                    <PlusIcon />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {configQuantity(config) > 1 || config.preparations ? (
            <div className="flex flex-col gap-2 rounded-lg border border-dashed p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Preparaciones</p>
                  <p className="text-[11px] text-muted-foreground">
                    {config.preparations
                      ? "Cada una puede tener opciones distintas."
                      : "Todas las unidades comparten las mismas opciones."}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    config.preparations
                      ? collapsePreparations()
                      : personalize()
                  }
                >
                  {config.preparations
                    ? "Configurar todas juntas"
                    : "Personalizar unidades"}
                </Button>
              </div>

              {config.preparations ? (
                <>
                  <ul className="flex flex-col gap-1.5">
                    {config.preparations.map((prep, index) => {
                      const variant = prep.variantId
                        ? variants.find(
                            (candidate) => candidate.id === prep.variantId
                          )
                        : null
                      const active =
                        index ===
                        Math.min(
                          prepIndex,
                          (config.preparations?.length ?? 1) - 1
                        )
                      const summary = [
                        variant?.name,
                        ...groups.map((group) =>
                          group.values
                            .filter((value) =>
                              prep.selectedOptions[group.id]?.includes(
                                value.id
                              )
                            )
                            .map((value) => itemOptionValueName(value))
                            .join(", ")
                        ),
                        prep.extraIds.length > 0
                          ? `+${prep.extraIds.length} extra(s)`
                          : null,
                        prep.excludedIds.length > 0
                          ? `sin ${exclusions
                              .filter((exclusion) =>
                                prep.excludedIds.includes(
                                  exclusion.ingredient.id
                                )
                              )
                              .map((exclusion) => exclusion.ingredient.name)
                              .join(", ")}`
                          : null,
                        prep.notes.trim() ? `“${prep.notes.trim()}”` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")

                      return (
                        <li
                          key={prep.id}
                          className={cn(
                            "flex flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5",
                            active && "border-primary bg-primary/5"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => setPrepIndex(index)}
                            className="min-w-0 flex-1 text-left text-xs"
                          >
                            <span className="font-medium">
                              Preparación {index + 1}
                            </span>
                            {summary ? (
                              <span className="text-muted-foreground">
                                {" "}
                                · {summary}
                              </span>
                            ) : null}
                          </button>
                          <div className="flex items-center gap-0.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              aria-label={`Quitar una unidad de la preparación ${index + 1}`}
                              disabled={prep.quantity <= 1}
                              onClick={() =>
                                updatePreparation(index, (current) => ({
                                  ...current,
                                  quantity: Math.max(1, current.quantity - 1),
                                }))
                              }
                            >
                              <MinusIcon />
                            </Button>
                            <span className="w-5 text-center text-xs tabular-nums">
                              {prep.quantity}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              aria-label={`Añadir una unidad a la preparación ${index + 1}`}
                              disabled={configQuantity(config) >= 99}
                              onClick={() =>
                                updatePreparation(index, (current) => ({
                                  ...current,
                                  quantity: Math.min(
                                    99,
                                    current.quantity + 1
                                  ),
                                }))
                              }
                            >
                              <PlusIcon />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Duplicar la preparación ${index + 1}`}
                              disabled={configQuantity(config) >= 99}
                              onClick={() => duplicatePreparation(index)}
                            >
                              <CopyIcon />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Quitar la preparación ${index + 1}`}
                              onClick={() => removePreparation(index)}
                            >
                              <Trash2Icon />
                            </Button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={configQuantity(config) >= 99}
                      onClick={() =>
                        addPreparation(editingPrep?.variantId ?? null)
                      }
                    >
                      <PlusIcon />
                      Agregar otra
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={applyPreparationToAll}
                    >
                      Aplicar a todas
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {config.preparations && editingPrep ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-xs">
              <span className="font-medium">
                Editando preparación{" "}
                {Math.min(prepIndex, config.preparations.length - 1) + 1}
              </span>
              {variants.length > 0 ? (
                <Select
                  value={editingPrep.variantId ?? undefined}
                  onValueChange={(value) =>
                    value && setEditingVariant(value)
                  }
                >
                  <SelectTrigger
                    size="sm"
                    className="ml-auto h-8 w-40"
                    aria-label="Presentación de la preparación"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {variants.map((variant) => (
                      <SelectItem key={variant.id} value={variant.id}>
                        {variant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-muted-foreground">
                  Los cambios aplican solo a esta preparación.
                </span>
              )}
            </div>
          ) : null}

          {groups.map((group) => {
            const availableValues = group.values.filter((value) =>
              isItemOptionValueAvailable(value)
            )
            const chosen = editing.selectedOptions[group.id] ?? []
            const chosenCount = chosen.filter((id) =>
              availableValues.some((value) => value.id === id)
            ).length
            const maxSelectable = Math.max(
              1,
              group.maxSelect ?? availableValues.length
            )
            const required =
              group.isRequired || (group.minSelect ?? 0) > 0

            return (
              <div key={group.id} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-baseline gap-1 text-sm font-medium">
                  <span>
                    {group.group.name}
                    {required ? (
                      <span className="text-destructive"> *</span>
                    ) : null}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {group.selection === "SINGLE"
                      ? "(Puedes elegir una)"
                      : `(${chosenCount}/${maxSelectable} seleccionables)`}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {availableValues.map((value) => {
                    const checked = chosen.includes(value.id)
                    const disabled =
                      group.selection === "MULTIPLE" &&
                      !checked &&
                      chosenCount >= maxSelectable
                    const valueName = itemOptionValueName(value)
                    const delta = Number(value.priceDelta)

                    return (
                      <Button
                        key={value.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-pressed={checked}
                        disabled={disabled}
                        className={jalapenoChipClass(checked)}
                        onClick={() =>
                          chooseOption(
                            group.id,
                            value.id,
                            group.selection === "MULTIPLE",
                            required
                          )
                        }
                      >
                        {valueName}
                        {delta !== 0 ? (
                          <span className="tabular-nums opacity-80">
                            +{money(value.priceDelta)}
                          </span>
                        ) : null}
                      </Button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {extras.length > 0 ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Extras</span>
              <div className="flex flex-wrap gap-1.5">
                {extras.map((extra) => {
                  const active = editing.extraIds.includes(extra.id)

                  return (
                    <Button
                      key={extra.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-pressed={active}
                      className={jalapenoChipClass(active)}
                      onClick={() => toggleExtra(extra.id)}
                    >
                      {extra.name}
                      {Number(extra.price) !== 0 ? (
                        <span className="tabular-nums opacity-80">
                          +{money(extra.price)}
                        </span>
                      ) : null}
                    </Button>
                  )
                })}
              </div>
            </div>
          ) : null}

          {exclusions.length > 0 ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Sin…</span>
              <div className="flex flex-wrap gap-1.5">
                {exclusions.map((exclusion) => {
                  const active = editing.excludedIds.includes(
                    exclusion.ingredient.id
                  )

                  return (
                    <Button
                      key={exclusion.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-pressed={active}
                      className={jalapenoChipClass(active)}
                      onClick={() =>
                        toggleExclusion(exclusion.ingredient.id)
                      }
                    >
                      Sin {exclusion.ingredient.name}
                    </Button>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="pos-notes">Notas para cocina</Label>
            <Textarea
              id="pos-notes"
              value={editing.notes}
              onChange={(event) => {
                const value = event.target.value

                updateEditing((current) => ({ ...current, notes: value }))
              }}
              placeholder="Ej. sin azúcar, bien caliente…"
              maxLength={200}
              rows={3}
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold tabular-nums">
              {money(total)}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={save}>
            {hasExistingLines ? "Guardar pedido" : "Añadir a la comanda"}
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>

      <AlertDialog open={collapseOpen} onOpenChange={setCollapseOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Undo2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>Configurar todas juntas</AlertDialogTitle>
            <AlertDialogDescription>
              Las preparaciones tienen opciones distintas. Al unirlas se
              conservará la configuración de la primera y se perderán las
              demás diferencias.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={applyCollapse}>
              Unir preparaciones
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
