"use client"

import * as React from "react"
import {
  ArrowDownToLineIcon,
  ArrowUpDownIcon,
  BanknoteIcon,
  BanknoteXIcon,
  CakeIcon,
  ConciergeBellIcon,
  CopyIcon,
  CreditCardIcon,
  GroupIcon,
  LayoutGridIcon,
  Link2Icon,
  Loader2Icon,
  LockIcon,
  MergeIcon,
  MinusIcon,
  MoreVerticalIcon,
  NotebookTextIcon,
  PencilLineIcon,
  PlusIcon,
  PrinterIcon,
  ReceiptTextIcon,
  SaveCheckIcon,
  SaveIcon,
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
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
import { Switch } from "@/components/ui/switch"
import {
  Sheet,
  SheetClose,
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
  isItemOptionValueAvailable,
  itemOptionValueName,
  type ItemListItem,
} from "@/lib/catalog"
import { useMoney } from "@/lib/currency"

import {
  cancelRoundFromPos,
  createOrder,
  deliverRoundFromPos,
  getChargeSummary,
  getComandaDetail,
  getKitchenRounds,
  getKitchenRoundsSummary,
  listOpenOrders,
  mergeOrders,
  prioritizeRound,
  releasePaymentRound,
  removeOrderGuest,
  sendRound,
  setOrderPartySize,
  updateOrderGuest,
  updateOrderTables,
  type RoundItemInput,
} from "@/lib/order-actions"
import { API_BASE_URL } from "@/lib/api-base"
import type { CashSessionPayload } from "@/lib/cash"
import type { Menu, MenuTrendingItem } from "@/lib/menus"
import { printOrderReceipt } from "@/lib/mercadopago-actions"
import { closeOrder } from "@/lib/payment-actions"
import { cancelOrderSplits } from "@/lib/split-actions"
import type { MercadoPagoPointConfig } from "@/lib/mercadopago"
import { isPdvTerminal } from "@/lib/mercadopago"
import type { PosDisplayInfo, PosDisplayState } from "@/lib/pos-display"
import type { DiningTable } from "@/lib/tables"
import {
  GUEST_AGE_RANGES,
  GUEST_AGE_RANGE_LABELS,
  GUEST_SEXES,
  GUEST_SEX_LABELS,
  ORDER_CHANNEL_LABELS,
  ROUND_STATUS_LABELS,
  orderLabel,
  ticketCode,
  type ChargeSummary,
  type ComandaDetail,
  type ComandaItem,
  type ComandaRound,
  type GuestAgeRange,
  type GuestSex,
  type KitchenRound,
  type KitchenRoundSummary,
  type Order,
  type OrderChannel,
  type OrderGuest,
  type OrderRound,
  type RoundStatus,
} from "@/lib/orders"
import { createPosDraft, listPosDrafts, type PosDraft } from "@/lib/pos-drafts"
import { openAccountOrders, splitServiceRounds } from "@/lib/pos-service"
import {
  appendComandaRound,
  comandaDetailKey,
  mergeComandaRounds,
} from "@/lib/pos-comanda"
import { startPosPerf } from "@/lib/pos-perf"
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
import { PosRenderProfiler } from "@/components/pos/pos-render-profiler"

import { CashSessionActions, CashSessionDialog, type CashSessionAction } from "./cash-session"
import { ChargeDialog } from "./charge-dialog"
import { OfflineCheckoutDialog } from "./offline-checkout-dialog"
import { PosDraftsSheet } from "./pos-drafts-sheet"
import { PosServiceQueueSheet, type ServiceQueueMode } from "./pos-service-queue-sheet"
import { SwipeableSheetContent } from "./swipeable-sheet-content"
import { TablePicker, type TablePickerMode } from "./table-picker"

const CHANNELS: OrderChannel[] = ["DINE_IN", "COUNTER", "PHONE", "DELIVERY"]

/** Clave de la vista «Todos» en la comanda cuando hay varios clientes. */
const ALL_GUESTS_KEY = "__all__"

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
function groupCartOptions<T extends { groupName: string }>(options: T[]) {
  const groups = new Map<string, T[]>()

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

interface ComandaOption {
  itemOptionValueId: string | null
  groupName: string
  name: string
  price: number
}

/** Línea unificada para pintar captura y rondas enviadas. */
interface ComandaLine {
  key: string
  itemId: string
  itemName: string
  variantId: string | null
  variantName: string | null
  quantity: number
  total: number
  notes: string | null
  extras: CartExtra[]
  options: ComandaOption[]
  excludedNames: string[]
  guestKey: string | null
  guestName: string | null
  sent: boolean
  roundId?: string
  roundNumber?: number
  roundStatus?: RoundStatus
}

function cartLineToComandaLine(line: CartLine): ComandaLine {
  return {
    key: line.key,
    itemId: line.itemId,
    itemName: line.itemName,
    variantId: line.variantId ?? null,
    variantName: line.variantName ?? null,
    quantity: line.quantity,
    total: cartLineTotal(line),
    notes: line.notes?.trim() || null,
    extras: line.extras,
    options: line.options.map((option) => ({
      itemOptionValueId: option.itemOptionValueId,
      groupName: option.groupName,
      name: option.name,
      price: option.price,
    })),
    excludedNames: line.excludedNames,
    guestKey: line.guestKey ?? null,
    guestName: null,
    sent: false,
  }
}

function orderItemToComandaLine(
  item: ComandaItem,
  round: ComandaRound,
  roundNumber: number
): ComandaLine {
  return {
    key: item.id,
    itemId: item.itemId,
    itemName: item.itemName,
    variantId: item.itemVariantId,
    variantName: item.variantName,
    quantity: item.quantity,
    total: Number(item.subtotal),
    notes: item.notes?.trim() || null,
    extras: item.extras.map((extra) => ({
      id: extra.id,
      name: extra.extraName,
      price: Number(extra.extraPrice),
    })),
    options: item.options.map((option) => ({
      itemOptionValueId: option.itemOptionValueId,
      groupName: option.groupName,
      name: option.optionName,
      price: Number(option.priceDelta),
    })),
    excludedNames: item.exclusions.map(
      (exclusion) => exclusion.ingredient.name
    ),
    guestKey: item.guestId ?? null,
    guestName: item.guestName ?? null,
    sent: true,
    roundId: round.id,
    roundNumber,
    roundStatus: round.status,
  }
}

function roundTimeLabel(round: Pick<OrderRound, "sentAt" | "createdAt">): string {
  const value = round.sentAt ?? round.createdAt
  if (!value) return ""

  return new Date(value).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  })
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
 * Tarjeta del catálogo del POS.
 *
 * Está memoizada porque el POS re-renderiza toda la grilla con cada cambio del
 * carrito o del buscador; sin esto se reconcilian cientos de tarjetas aunque
 * solo cambie una.
 */
type SetNumberValue = (
  value: number | ((current: number) => number)
) => void
type SetBooleanValue = (
  value: boolean | ((current: boolean) => boolean)
) => void

/**
 * Controles del popover «Vista».
 *
 * Primera fila: ancho y altura de tarjetas. Segunda fila: tamaño del texto e
 * imágenes. Se comparte entre escritorio y tablet para que no diverjan.
 */
function PosViewFields({
  cardColumns,
  setCardColumns,
  cardTextSize,
  setCardTextSize,
  squareCards,
  setSquareCards,
  showImages,
  setShowImages,
}: {
  cardColumns: number
  setCardColumns: SetNumberValue
  cardTextSize: number
  setCardTextSize: SetNumberValue
  squareCards: boolean
  setSquareCards: SetBooleanValue
  showImages: boolean
  setShowImages: SetBooleanValue
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Ancho de tarjetas
          </span>
          <ButtonGroup aria-label="Ancho de las tarjetas">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Tarjetas más pequeñas"
              title="Tarjetas más pequeñas"
              disabled={cardColumns >= 7}
              onClick={() =>
                setCardColumns((current) => Math.min(7, current + 1))
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
                setCardColumns((current) => Math.max(4, current - 1))
              }
            >
              <PlusIcon className="size-4" />
            </Button>
          </ButtonGroup>
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

      <div className="grid grid-cols-2 gap-3">
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
                setCardTextSize((current) => Math.max(1, current - 1))
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
                setCardTextSize((current) => Math.min(4, current + 1))
              }
            >
              <PlusIcon className="size-4" />
            </Button>
          </ButtonGroup>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Imágenes
          </span>
          <div className="flex h-8 items-center justify-between gap-2">
            <span className="text-sm">Mostrar</span>
            <Switch
              aria-label="Mostrar imágenes en las tarjetas"
              checked={showImages}
              onCheckedChange={setShowImages}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

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
  kitchenAdvanced = false,
  diningTables = [],
  initialServiceRoundSummary = [],
  initialDrafts = [],
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
  /** La sucursal usa cocina Avanzada (estaciones y rondas retenidas). */
  kitchenAdvanced?: boolean
  /** Mesas configuradas de la sucursal. */
  diningTables?: DiningTable[]
  /** Contadores de rondas activas de cocina para la barra móvil. */
  initialServiceRoundSummary?: KitchenRoundSummary[]
  /** Borradores activos al cargar la página. */
  initialDrafts?: PosDraft[]
}) {
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
  /** Mostrar imágenes en las cards del catálogo. */
  const [showImages, setShowImages] = usePersistentBoolean(
    "pos-card-images",
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
  const [chargeOrder, setChargeOrder] = React.useState<Order | null>(null)
  const [payFirstRoundId, setPayFirstRoundId] = React.useState<string | null>(
    null
  )
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
  /**
   * Copia viva de las cuentas abiertas. `orders` solo la inicializa: las
   * acciones del POS actualizan esta copia sin recargar la ruta completa.
   */
  const [liveOrders, setLiveOrders] = React.useState<Order[]>(orders)
  /** Cuenta recién creada que la lista viva aún no incluye. */
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
  const initialFreeTable = diningTables.find(
    (table) => table.isActive && table.activeOrders.length === 0
  )
  const [tableNumber, setTableNumber] = React.useState(
    initialFreeTable?.number ?? "1"
  )
  const [tableId, setTableId] = React.useState(initialFreeTable?.id ?? "")
  const [draftTableIds, setDraftTableIds] = React.useState<string[]>(
    initialFreeTable ? [initialFreeTable.id] : []
  )
  const [tablePickerOpen, setTablePickerOpen] = React.useState(false)
  const [tablePickerMode, setTablePickerMode] =
    React.useState<TablePickerMode>("select")
  const [mergeAccountOrderId, setMergeAccountOrderId] = React.useState<
    string | null
  >(null)
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
  const guestBusyRef = React.useRef(false)
  const guestBusyOrderRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    guestBusyRef.current = guestBusy
  }, [guestBusy])

  const beginGuestBusy = React.useCallback((targetOrderId: string) => {
    guestBusyRef.current = true
    guestBusyOrderRef.current = targetOrderId
    setGuestBusy(true)
  }, [])

  const endGuestBusy = React.useCallback(() => {
    guestBusyRef.current = false
    guestBusyOrderRef.current = null
    setGuestBusy(false)
  }, [])
  const [displayId, setDisplayId] = React.useState(displays[0]?.id ?? "")
  const [displayState, setDisplayState] =
    React.useState<PosDisplayState | null>(null)
  const displaySession = React.useRef<string | null>(null)
  const [sending, setSending] = React.useState(false)
  const [savingDraft, setSavingDraft] = React.useState(false)
  const [draftsOpen, setDraftsOpen] = React.useState(false)
  /** Lista compartida con el sheet: abrir no vuelve a consultar la API. */
  const [serviceDrafts, setServiceDrafts] =
    React.useState<PosDraft[]>(initialDrafts)
  const draftCount = serviceDrafts.length
  const [holdRound, setHoldRound] = React.useState(false)

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

  const visibleOrders = React.useMemo(() => {
    const base =
      pendingOrder && !liveOrders.some((order) => order.id === pendingOrder.id)
        ? [pendingOrder, ...liveOrders]
        : liveOrders

    return base.filter((order) => !offlinePaidOrderIds.has(order.id))
  }, [liveOrders, offlinePaidOrderIds, pendingOrder])

  /** Recarga solo las cuentas abiertas; no vuelve a pedir catálogo ni menús. */
  const refreshOrders = React.useCallback(async () => {
    const endPerf = startPosPerf("orders.refresh")
    const result = await listOpenOrders()

    if (result.ok && result.data) {
      setLiveOrders(result.data)
    }

    endPerf({ orders: result.data?.length ?? 0 })
    return result
  }, [])

  const patchOrderLocal = React.useCallback(
    (targetOrderId: string, patch: Partial<Order>) => {
      setLiveOrders((current) =>
        current.map((order) =>
          order.id === targetOrderId ? { ...order, ...patch } : order
        )
      )
      setPendingOrder((current) =>
        current && current.id === targetOrderId
          ? { ...current, ...patch }
          : current
      )
    },
    []
  )

  // Incluye la cuenta recién creada aunque el refresh todavía no la traiga.
  const selectOrders = React.useMemo(() => {
    if (!pendingOrder) return liveOrders
    if (liveOrders.some((order) => order.id === pendingOrder.id)) return liveOrders

    return [pendingOrder, ...liveOrders]
  }, [liveOrders, pendingOrder])

  /** Ocupación local: se actualiza al mover mesas sin esperar al servidor. */
  const tablePickerTables = React.useMemo(
    () =>
      diningTables.map((table) => ({
        ...table,
        activeOrders: selectOrders
          .filter(
            (order) =>
              !offlinePaidOrderIds.has(order.id) &&
              (order.tables ?? []).some((row) => row.table.id === table.id)
          )
          .map((order) => ({
            id: order.id,
            status: order.status,
            channel: order.channel ?? "DINE_IN",
            tableNumber: order.tableNumber,
            customerName: order.customerName ?? null,
            partySize: order.partySize,
            total: order.total,
            createdAt: order.createdAt,
          })),
      })),
    [diningTables, offlinePaidOrderIds, selectOrders]
  )

  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    if (!pendingOrder) return
    if (liveOrders.some((order) => order.id === pendingOrder.id)) {
      setPendingOrder(null)
    }
  }, [liveOrders, pendingOrder])
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
  /** El cobro se abrió desde la lista de cuentas por cobrar, no del POS. */
  const queueChargeRef = React.useRef(false)

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

  /**
   * La lista de cuentas trae rondas resumidas; al abrir una comanda se pide
   * solo el detalle de artículos. La firma excluye estados de ronda: cocina
   * puede avanzar sin invalidar los artículos ya cacheados.
   */
  const orderDetailCache = React.useRef(new Map<string, ComandaDetail>())
  const [orderDetail, setOrderDetail] = React.useState<{
    key: string
    detail: ComandaDetail
  } | null>(null)
  const [orderDetailErrorKey, setOrderDetailErrorKey] = React.useState<
    string | null
  >(null)
  const [orderDetailRetry, setOrderDetailRetry] = React.useState(0)
  const orderDetailKey = React.useMemo(
    () =>
      activeOrder
        ? comandaDetailKey(activeOrder.id, activeOrder.rounds)
        : null,
    [activeOrder]
  )
  const activeOrderDetail =
    orderDetail && orderDetail.detail.id === activeOrderId
      ? orderDetail.detail
      : null
  const detailRoundIds = React.useMemo(
    () => new Set(activeOrderDetail?.rounds.map((round) => round.id) ?? []),
    [activeOrderDetail]
  )
  const detailComplete = React.useMemo(() => {
    if (!activeOrder || !activeOrderDetail) return false

    return activeOrder.rounds
      .filter((round) => round.status !== "CANCELLED")
      .every((round) => detailRoundIds.has(round.id))
  }, [activeOrder, activeOrderDetail, detailRoundIds])

  React.useEffect(() => {
    if (!activeOrderId || !orderDetailKey) return

    if (orderDetail?.detail.id === activeOrderId && detailComplete) {
      return
    }

    const cached = orderDetailCache.current.get(orderDetailKey)

    if (cached) {
      setOrderDetail({ key: orderDetailKey, detail: cached })
      setOrderDetailErrorKey(null)
      return
    }

    let cancelled = false
    setOrderDetailErrorKey(null)

    getComandaDetail(activeOrderId).then((result) => {
      if (cancelled) return

      if (!result.ok || !result.data) {
        setOrderDetailErrorKey(orderDetailKey)
        return
      }

      orderDetailCache.current.set(orderDetailKey, result.data)
      setOrderDetail({ key: orderDetailKey, detail: result.data })
    })

    return () => {
      cancelled = true
    }
  }, [
    activeOrderId,
    detailComplete,
    orderDetail?.detail.id,
    orderDetail?.key,
    orderDetailKey,
    orderDetailRetry,
  ])

  const activeGuest =
    activeGuestKey === null
      ? null
      : guests.find((guest) => guest.key === activeGuestKey) ?? null
  const isDineIn = activeOrder
    ? (activeOrder.channel ?? "DINE_IN") === "DINE_IN"
    : channel === "DINE_IN"
  const displayChannel = activeOrder?.channel ?? channel
  const total = cart.reduce((sum, line) => sum + cartLineTotal(line), 0)
  const pendingPaymentRounds =
    activeOrder?.rounds?.filter((round) => round.status === "PENDING_PAYMENT") ??
    []
  const pendingPaymentRound = pendingPaymentRounds[0] ?? null
  const dialogOrder = chargeOrder ?? activeOrder
  const activeTableIds =
    activeOrder?.tables?.map((row) => row.table.id) ??
    (draftTableIds.length > 0
      ? draftTableIds
      : tableNumber
        ? diningTables.filter((t) => t.number === tableNumber).map((t) => t.id)
        : [])
  const payFirstAmount =
    Math.max(Number(activeOrder?.balance ?? 0), 0) + total

  // La comanda se muestra como columna solo cuando hay ancho suficiente para
  // catálogo + panel (xl). En tablet horizontal y teléfono se usa el sheet.
  const showComandaColumn = useMediaQuery("(min-width: 1280px)", true)
  const isDesktopClient = useMediaQuery("(min-width: 1280px)", false)
  const isPhone = useMediaQuery("(max-width: 767px)", true)
  const [comandaOpen, setComandaOpen] = React.useState(false)
  const [serviceRoundSummary, setServiceRoundSummary] =
    React.useState<KitchenRoundSummary[]>(initialServiceRoundSummary)
  const [serviceRounds, setServiceRounds] = React.useState<KitchenRound[]>([])
  const [serviceRoundsLoading, setServiceRoundsLoading] = React.useState(false)
  const [serviceQueueMode, setServiceQueueMode] =
    React.useState<ServiceQueueMode | null>(null)
  const serviceQueueModeRef = React.useRef<ServiceQueueMode | null>(null)

  React.useEffect(() => {
    serviceQueueModeRef.current = serviceQueueMode
  }, [serviceQueueMode])

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

  /** Unidades del borrador nuevo, aunque el usuario esté viendo otra cuenta. */
  const newDraftUnits = React.useMemo(() => {
    const lines = orderId ? (draftsRef.current.get("")?.cart ?? []) : cart

    return lines.reduce((count, line) => count + line.quantity, 0)
  }, [cart, orderId])

  const { ready: readyQueueRounds } = React.useMemo(
    () => splitServiceRounds(serviceRoundSummary),
    [serviceRoundSummary]
  )
  const openAccounts = React.useMemo(
    () => openAccountOrders(carouselOrders),
    [carouselOrders]
  )

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

  // Totales visibles: lo ya enviado en la cuenta + la captura sin enviar.
  const sentSubtotal = Number(activeOrder?.subtotal ?? 0)
  const sentTax = Number(activeOrder?.taxTotal ?? 0)
  const sentTotal = Number(activeOrder?.total ?? 0)
  const comandaSubtotal =
    Math.round((sentSubtotal + taxBreakdown.subtotal) * 100) / 100
  const comandaTax = Math.round((sentTax + taxBreakdown.tax) * 100) / 100
  const comandaTotal = Math.round((sentTotal + total) * 100) / 100
  const saldoConCaptura =
    Math.round(
      (Math.max(Number(activeOrder?.balance ?? 0), 0) + total) * 100
    ) / 100

  // Sincroniza los clientes con la cuenta seleccionada. En un borrador nuevo
  // siempre existe al menos Cliente 1.
  const activeOrderSyncRef = React.useRef<Order | null>(activeOrder)
  React.useEffect(() => {
    activeOrderSyncRef.current = activeOrder
  })
  React.useEffect(() => {
    const orderForSync = activeOrderSyncRef.current

    if (!orderForSync) {
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
    if (restoringRef.current === orderForSync.id) {
      restoringRef.current = null
      return
    }

    const serverGuests = orderForSync.guests ?? []
    const skipGuestSync =
      guestBusyRef.current && guestBusyOrderRef.current === orderForSync.id

    setChannel(orderForSync.channel ?? "DINE_IN")
    setTableNumber(orderForSync.tableNumber ?? "1")
    // Los datos de contacto no deben arrastrarse de otra cuenta.
    setCustomerName(orderForSync.customerName ?? "")
    setCustomerPhone(orderForSync.customerPhone ?? "")
    setDeliveryAddress(orderForSync.deliveryAddress ?? "")
    setDeliveryFee(orderForSync.deliveryFee ?? "0")

    if (!skipGuestSync) {
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
        Math.min(20, orderForSync.partySize ?? Math.max(1, serverGuests.length))
      )
      setActiveGuestKey((current) =>
        current && serverGuests.some((guest) => guest.id === current)
          ? current
          : (serverGuests[0]?.id ?? null)
      )

      if ((orderForSync.channel ?? "DINE_IN") !== "DINE_IN") {
        setCustomerSex(serverGuests[0]?.sex ?? null)
        setCustomerAgeRange(serverGuests[0]?.ageRange ?? null)
      }
    }
  }, [activeOrder?.id, activeOrder?.updatedAt, setChannel])

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
    for (const order of liveOrders) knownOrderIds.current.add(order.id)
  }, [liveOrders])

  React.useEffect(() => {
    if (!orderId) return
    if (liveOrders.some((order) => order.id === orderId)) return
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
  }, [liveOrders, orderId, resetChannel])

  // Sin «General»: en mesa siempre hay un cliente activo. Si el cliente
  // seleccionado desaparece, se toma el primero de la lista. En mostrador no
  // se usan clientes: las líneas quedan sin `guestKey` (General interno).
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    setActiveGuestKey((current) => {
      if (!isDineIn || guests.length === 0) return null
      if (current === ALL_GUESTS_KEY && guests.length > 1) return current
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
          .filter(
            (line) =>
              activeGuestKey === ALL_GUESTS_KEY ||
              (line.guestKey ?? null) === activeGuestKey
          )
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
      setTableId("")
      setDraftTableIds([])
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
    setTableId("")
    setDraftTableIds([])
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
   * Refresca los contadores de la barra móvil: rondas de cocina y borradores.
   */
  const refreshServiceData = React.useCallback(async () => {
    const endPerf = startPosPerf("service.summary")
    const [roundsResult, draftsResult] = await Promise.all([
      getKitchenRoundsSummary(),
      listPosDrafts(),
    ])

    if (roundsResult.ok && roundsResult.data) {
      setServiceRoundSummary(roundsResult.data)
    }

    if (draftsResult.ok && draftsResult.data) {
      setServiceDrafts(draftsResult.data)
    }

    endPerf({
      rounds: roundsResult.data?.length ?? 0,
      drafts: draftsResult.data?.length ?? 0,
    })
  }, [])

  const refreshFullServiceRounds = React.useCallback(async () => {
    const endPerf = startPosPerf("service.full-rounds")
    setServiceRoundsLoading(true)

    try {
      const result = await getKitchenRounds()

      if (result.ok && result.data) {
        setServiceRounds(result.data)
      }

      endPerf({ rounds: result.data?.length ?? 0 })
    } finally {
      setServiceRoundsLoading(false)
    }
  }, [])

  function openServiceQueue(mode: ServiceQueueMode) {
    setServiceQueueMode(mode)
    void refreshOrders()
    void refreshServiceData()

    if (mode !== "pending") {
      void refreshFullServiceRounds()
    }
  }

  const canPrintReceipt = mercadoPago.terminals.some(isPdvTerminal)

  async function handlePrintQueueOrder(orderId: string) {
    const result = await printOrderReceipt(orderId)

    if (!result.ok || !result.data) {
      toast.error(result.message ?? "No se pudo imprimir la cuenta")
      return
    }

    toast.success("Ticket enviado a la terminal")
  }

  function handleChargeQueueOrder(order: Order) {
    queueChargeRef.current = true
    setServiceQueueMode(null)
    setChargeOrder(order)
    setCharging(true)
  }

  async function handleCloseQueueOrder(orderId: string) {
    const result = await closeOrder(orderId)

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo cerrar la cuenta")
      return
    }

    toast.success("Cuenta cerrada")
    await Promise.all([refreshOrders(), refreshServiceData()])

    if (serviceQueueMode && serviceQueueMode !== "pending") {
      void refreshFullServiceRounds()
    }
  }

  async function handleDeliverQueueRound(round: KitchenRound) {
    const result = await deliverRoundFromPos(round.order.id, round.id)

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo entregar la ronda")
      return
    }

    toast.success("Ronda entregada")
    await Promise.all([refreshOrders(), refreshServiceData()])

    if (serviceQueueMode !== null) {
      void refreshFullServiceRounds()
    }
  }

  async function handleCancelQueueRound(round: KitchenRound) {
    const result = await cancelRoundFromPos(round.order.id, round.id)

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo cancelar la ronda")
      return
    }

    toast.success("Ronda cancelada")
    setServiceQueueMode(null)

    if (orderId === round.order.id) {
      resetNewDraft()
      setPendingOrder(null)
      setComandaOpen(false)
    }

    await Promise.all([refreshOrders(), refreshServiceData()])

    if (serviceQueueMode !== null) {
      void refreshFullServiceRounds()
    }
  }

  async function handlePrioritizeQueueRound(round: KitchenRound) {
    const result = await prioritizeRound(round.order.id, round.id)

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo priorizar la ronda")
      return
    }

    toast.success("Prioridad enviada a cocina")
    await refreshServiceData()

    if (serviceQueueMode !== null) {
      void refreshFullServiceRounds()
    }
  }

  function handleEditQueueOrder(orderId: string) {
    if (!selectOrders.some((order) => order.id === orderId)) {
      toast.error("La cuenta ya no está disponible para editar")
      return
    }

    selectOrder(orderId)
    setServiceQueueMode(null)
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

  /** Deja limpia la captura para atender al siguiente comensal. */
  const clearDraftCapture = () => {
    setCart([])
    resetChannel()
    setTableNumber("1")
    setTableId("")
    setDraftTableIds([])
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
    displaySession.current = null
    dismissComboNotice()
    setComboConflict(null)
  }

  React.useEffect(() => {
    const initial = window.setTimeout(() => void refreshServiceData(), 0)
    const timer = window.setInterval(() => {
      if (document.hidden) return

      void refreshServiceData()

      if (
        serviceQueueModeRef.current &&
        serviceQueueModeRef.current !== "pending"
      ) {
        void refreshFullServiceRounds()
      }
    }, 30_000)

    return () => {
      window.clearTimeout(initial)
      window.clearInterval(timer)
    }
  }, [refreshFullServiceRounds, refreshServiceData])

  /**
   * Guarda la captura en el servidor sin abrir cuenta.
   *
   * No ocupa mesa ni genera tickets; la mesa queda libre para el siguiente
   * comensal. El borrador lo puede reanudar cualquier persona del POS.
   */
  const handleSaveDraft = async () => {
    if (cart.length === 0) {
      toast.error("Añade al menos un artículo")
      return
    }

    if (!offline.isOnline) {
      toast.error("Conecta el dispositivo para guardar el borrador")
      return
    }

    setSavingDraft(true)

    try {
      const result = await createPosDraft({
        orderId: orderId || undefined,
        channel,
        tableNumber:
          channel === "DINE_IN" ? tableNumber.trim() || undefined : undefined,
        tableId: channel === "DINE_IN" ? tableId || undefined : undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerSex,
        customerAgeRange,
        deliveryAddress: deliveryAddress.trim() || undefined,
        deliveryFee: Number(deliveryFee) || 0,
        partySize: channel === "DINE_IN" ? partySize : 1,
        cart,
        guests,
        total,
      })

      if (!result.ok || !result.data) {
        toast.error(result.message ?? "No se pudo guardar el borrador")
        return
      }

      draftsRef.current.delete(orderId)
      draftsRef.current.delete("")
      setOrderId("")
      setPendingOrder(null)
      clearDraftCapture()
      setComandaOpen(false)
      const savedDraft = result.data
      setServiceDrafts((current) => [
        savedDraft,
        ...current.filter((entry) => entry.id !== savedDraft.id),
      ])
      toast.success("Borrador guardado", {
        description:
          "Vence en 15 minutos y cualquier persona del POS puede reanudarlo.",
      })
    } finally {
      setSavingDraft(false)
    }
  }

  /** Restaura una captura guardada; el borrador ya quedó consumido. */
  const handleResumeDraft = (draft: PosDraft) => {
    setServiceDrafts((current) =>
      current.filter((entry) => entry.id !== draft.id)
    )

    const targetOrderId =
      draft.orderId && liveOrders.some((order) => order.id === draft.orderId)
        ? draft.orderId
        : ""

    draftsRef.current.delete(orderId)
    draftsRef.current.delete("")
    restoringRef.current = targetOrderId || "__new__"

    setOrderId(targetOrderId)
    setPendingOrder(null)
    setCart(draft.cart as CartLine[])
    setChannel(draft.channel)
    setTableNumber(draft.tableNumber ?? "1")
    setTableId(draft.tableId ?? "")
    setDraftTableIds(draft.tableId ? [draft.tableId] : [])
    setCustomerName(draft.customerName ?? "")
    setCustomerSex(draft.customerSex)
    setCustomerAgeRange(draft.customerAgeRange)
    setCustomerPhone(draft.customerPhone ?? "")
    setDeliveryAddress(draft.deliveryAddress ?? "")
    setDeliveryFee(draft.deliveryFee)
    setGuests(
      Array.isArray(draft.guests) && draft.guests.length > 0
        ? (draft.guests as GuestDraft[])
        : [
            {
              key: newGuestKey(),
              name: "",
              savedName: "",
              sex: null,
              ageRange: null,
            },
          ]
    )
    setPartySize(Math.max(1, draft.partySize))
    setPartySizeDraft(String(Math.max(1, draft.partySize)))
    setActiveGuestKey(null)
    setPendingProductId(null)
    setComandaOpen(true)
    toast.success("Borrador reanudado")
  }

  const handleSend = async (payFirst = false) => {
    if (cart.length === 0) {
      toast.error("Añade al menos un artículo")
      return
    }

    if (payFirst) {
      if (displayChannel !== "COUNTER") {
        toast.error("El cobro anticipado solo está disponible en mostrador")
        return
      }

      if (!canConfirm) {
        toast.error("Solo caja o administración pueden cobrar y enviar")
        return
      }

      if (!offline.isOnline) {
        toast.error("Conecta el dispositivo para cobrar y enviar")
        return
      }

      if (holdRound) setHoldRound(false)
    }

    if (channel === "DINE_IN" && !tableNumber.trim()) {
      toast.error("Escribe el número de mesa")
      return
    }

    if (channel === "PHONE" && !customerName.trim()) {
      toast.error("Escribe el nombre del cliente para Drive-Thru")
      return
    }

    if (channel === "DELIVERY" && !customerPhone.trim()) {
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
      setOrderId("")
      setPendingOrder(null)
      clearDraftCapture()
      setComandaOpen(false)
    }

    if (!offline.isOnline) {
      await queueOffline()
      return
    }

    setSending(true)
    const endSendPerf = startPosPerf("round.send")

    try {
      let targetId = orderId
      let createdGuests: OrderGuest[] = []
      let createdOrder: Order | null = null

      if (!targetId) {
        const created = await createOrder({
          channel,
          tableNumber:
            channel === "DINE_IN"
              ? tableNumber.trim() || "1"
              : undefined,
          tableIds:
            channel === "DINE_IN" && draftTableIds.length > 0
              ? draftTableIds
              : channel === "DINE_IN" && tableId
                ? [tableId]
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
        createdOrder = created.data
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
        hold: payFirst ? undefined : holdRound || undefined,
        paymentPending: payFirst || undefined,
      })

      if (!result.ok) {
        if (result.network) {
          await queueOffline(targetId)
          return
        }

        toast.error(result.message ?? "No se pudo enviar la ronda")
        return
      }

      if (result.data) {
        const seededRound: ComandaRound = result.data

        setOrderDetail((current) => ({
          key: current?.key ?? "",
          detail: appendComandaRound(
            current?.detail ?? null,
            targetId,
            seededRound
          ),
        }))
      }

      if (payFirst) {
        setPayFirstRoundId(result.data?.id ?? null)
        const baseOrder = activeOrder ?? createdOrder

        if (baseOrder) {
          const nextTotal = Number(baseOrder.total) + total

          setChargeOrder({
            ...baseOrder,
            total: nextTotal.toFixed(2),
            rounds: result.data
              ? [...(baseOrder.rounds ?? []), result.data]
              : baseOrder.rounds,
          })
        }

        setCharging(true)
        setComandaOpen(false)
        toast.success("Pedido guardado · cobra para enviarlo a cocina")
      } else {
        toast.success(
          holdRound
            ? "Ronda retenida · dispara desde cocina"
            : `Ronda enviada · ${money(total)}`
        )
      }
      setHoldRound(false)

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
      setOrderId("")
      setPendingOrder(null)
      clearDraftCapture()
      setComandaOpen(false)

      // En cobro anticipado el diálogo refresca al cerrarse; no competir con
      // la carga del resumen de cobro.
      if (!payFirst) {
        void refreshOrders()
        void refreshServiceData()
      }
    } catch {
      if (!navigator.onLine) {
        await queueOffline(orderId || undefined)
      } else {
        toast.error("No se pudo enviar la ronda")
      }
    } finally {
      setSending(false)
      endSendPerf({ payFirst })
    }
  }

  /** Etiqueta visible de un cliente según su posición. */
  const guestDisplayName = (guest: GuestDraft, index: number) =>
    guest.name.trim() || `Cliente ${index + 1}`

  /**
   * Rondas de la comanda: estados y horas frescos del listado, artículos del
   * detalle cacheado. Los cambios de cocina no invalidan los artículos.
   */
  const comandaRounds = React.useMemo<ComandaRound[]>(
    () =>
      mergeComandaRounds(
        activeOrder?.rounds ?? [],
        activeOrderDetail?.rounds
      ),
    [activeOrder, activeOrderDetail]
  )

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

    for (const round of comandaRounds) {
      for (const item of round.items) add(item.guestId, item.quantity)
    }

    return units
  }, [cart, comandaRounds])

  const visibleCart = React.useMemo(
    () =>
      activeGuestKey === ALL_GUESTS_KEY
        ? cart
        : cart.filter((line) => (line.guestKey ?? null) === activeGuestKey),
    [cart, activeGuestKey]
  )

  /** Rondas enviadas, con sus artículos completos cuando ya llegó el detalle. */
  const sentRounds = React.useMemo(() => {
    const groups: Array<{
      round: ComandaRound
      number: number
      lines: ComandaLine[]
    }> = []

    comandaRounds.forEach((round, index) => {
      if (round.items.length === 0) return

      groups.push({
        round,
        number: index + 1,
        lines: round.items.map((item) =>
          orderItemToComandaLine(item, round, index + 1)
        ),
      })
    })

    return groups
  }, [comandaRounds])

  const hasSentRounds = (activeOrder?.rounds ?? []).some(
    (round) => round.status !== "CANCELLED"
  )
  const itemsLoading =
    Boolean(activeOrder && hasSentRounds) &&
    !activeOrderDetail &&
    orderDetailErrorKey !== orderDetailKey
  const itemsUpdating =
    Boolean(activeOrder && hasSentRounds && activeOrderDetail) &&
    !detailComplete &&
    orderDetailErrorKey !== orderDetailKey
  const itemsError =
    Boolean(activeOrder && hasSentRounds && orderDetailKey) &&
    orderDetailErrorKey === orderDetailKey

  const visibleSentRounds = React.useMemo(() => {
    if (activeGuestKey === ALL_GUESTS_KEY) return sentRounds

    return sentRounds
      .map((group) => ({
        ...group,
        lines: group.lines.filter(
          (line) => (line.guestKey ?? null) === activeGuestKey
        ),
      }))
      .filter((group) => group.lines.length > 0)
  }, [sentRounds, activeGuestKey])

  const sentLines = React.useMemo(
    () => sentRounds.flatMap((group) => group.lines),
    [sentRounds]
  )

  const allComandaGroups = React.useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string
        name: string
        quantity: number
        total: number
        lines: ComandaLine[]
      }
    >()
    const lines = [...sentLines, ...cart.map(cartLineToComandaLine)]

    for (const line of lines) {
      const key = `${line.itemId}::${line.variantId ?? ""}`
      const name = line.variantName
        ? `${line.itemName} ${line.variantName}`
        : line.itemName
      const current = groups.get(key)

      if (current) {
        current.quantity += line.quantity
        current.total += line.total
        current.lines.push(line)
      } else {
        groups.set(key, {
          key,
          name,
          quantity: line.quantity,
          total: line.total,
          lines: [line],
        })
      }
    }

    return [...groups.values()]
  }, [cart, sentLines])

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

    beginGuestBusy(orderId)

    try {
      const result = await updateOrderGuest(orderId, guest.id, changes)

      if (!result.ok) {
        setGuests((current) =>
          current.map((entry) =>
            entry.key === guest.key
              ? {
                  ...entry,
                  name: guest.name,
                  sex: guest.sex,
                  ageRange: guest.ageRange,
                }
              : entry
          )
        )
        toast.error(result.message ?? "No se pudo actualizar el cliente")
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

      patchOrderLocal(orderId, {
        guests: (activeOrder?.guests ?? []).map((entry) =>
          entry.id === guest.id
            ? {
                ...entry,
                ...(changes.name === undefined ? {} : { name: changes.name }),
                ...(changes.sex === undefined ? {} : { sex: changes.sex }),
                ...(changes.ageRange === undefined
                  ? {}
                  : { ageRange: changes.ageRange }),
              }
            : entry
        ),
      })
    } finally {
      endGuestBusy()
    }
  }

  /** Ajusta el número de clientes de forma optimista y persiste en lote. */
  const changePartySize = async (next: number) => {
    if (guestBusy) return

    const endLocalPerf = startPosPerf("party-size.local")
    const target = Math.min(20, Math.max(1, next))

    if (target === partySize && guests.length === target) return

    posCapture.noteComandaInteraction()

    const previousGuests = guests
    const previousPartySize = partySize
    const currentCount = guests.length

    if (target > currentCount) {
      const additions = target - currentCount

      setGuests([
        ...guests,
        ...Array.from({ length: additions }, () => ({
          key: newGuestKey(),
          name: "",
          savedName: "",
          sex: null,
          ageRange: null,
        })),
      ])
    } else if (target < currentCount) {
      const removed = guests.slice(target)
      const fallbackGuestKey = guests[0]?.key ?? null

      setCart((current) =>
        current.map((line) =>
          removed.some((guest) => guest.key === line.guestKey)
            ? { ...line, guestKey: fallbackGuestKey }
            : line
        )
      )
      setGuests(guests.slice(0, target))

      if (
        activeGuestKey &&
        removed.some((guest) => guest.key === activeGuestKey)
      ) {
        setActiveGuestKey(fallbackGuestKey)
      }
    }

    setPartySize(target)
    setPartySizeDraft(String(target))
    endLocalPerf({ target, guests: guests.length })

    if (!orderId) return

    const endBatchPerf = startPosPerf("party-size.batch")
    beginGuestBusy(orderId)

    try {
      const result = await setOrderPartySize(orderId, target)

      if (!result.ok || !result.data) {
        setGuests(previousGuests)
        setPartySize(previousPartySize)
        setPartySizeDraft(String(previousPartySize))
        toast.error(result.message ?? "No se pudo ajustar el número de clientes")
        return
      }

      const serverGuests = result.data

      setGuests((current) =>
        serverGuests.map((guest, index) => ({
          key: current[index]?.key ?? guest.id,
          id: guest.id,
          name: guest.name,
          savedName: guest.name,
          sex: guest.sex ?? null,
          ageRange: guest.ageRange ?? null,
        }))
      )

      patchOrderLocal(orderId, {
        partySize: target,
        guests: serverGuests,
      })
      setPartySize(target)
      setPartySizeDraft(String(target))
    } catch {
      setGuests(previousGuests)
      setPartySize(previousPartySize)
      setPartySizeDraft(String(previousPartySize))
      toast.error("No se pudo ajustar el número de clientes")
    } finally {
      endGuestBusy()
      endBatchPerf({ target })
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

    beginGuestBusy(orderId ?? "")

    try {
      if (orderId && guestRemoving.id) {
        const result = await removeOrderGuest(orderId, guestRemoving.id)

        if (!result.ok) {
          toast.error(result.message ?? "No se pudo quitar el cliente")
          return
        }
      }

      const removedKey = guestRemoving.key
      const fallbackGuestKey =
        guests.find((guest) => guest.key !== removedKey)?.key ?? null
      const nextPartySize = Math.max(1, partySize - 1)

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
      setPartySize(nextPartySize)
      setPartySizeDraft(String(nextPartySize))

      if (activeGuestKey === removedKey) setActiveGuestKey(fallbackGuestKey)

      if (orderId) {
        patchOrderLocal(orderId, {
          partySize: nextPartySize,
          guests: (activeOrder?.guests ?? []).filter(
            (guest) => guest.id !== guestRemoving.id
          ),
        })
      }

      setPartySize(nextPartySize)
      setPartySizeDraft(String(nextPartySize))
      setGuestRemoving(null)
    } finally {
      endGuestBusy()
    }
  }

  const comandaHeaderContent = (
    <>
      <CardTitle className="flex items-center gap-2">
        <PencilLineIcon className="size-4" />
        Comanda
        {activeOrder?.ticketNumber ? (
          <Badge variant="secondary" size="sm">
            {ticketCode(activeOrder.ticketNumber)}
          </Badge>
        ) : null}
      </CardTitle>
      {!showComandaColumn ? (
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
      ) : null}
    </>
  )

  const comandaHeader = showComandaColumn ? (
    <CardHeader className="flex flex-row items-center justify-between gap-2 p-0">
      {comandaHeaderContent}
    </CardHeader>
  ) : (
    <div
      data-sheet-drag-handle
      className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3"
    >
      {comandaHeaderContent}
    </div>
  )

  const comandaItemsError = itemsError ? (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
      <span>No se pudieron cargar los artículos de la cuenta.</span>
      <Button
        type="button"
        variant="outline"
        size="xs"
        onClick={() => setOrderDetailRetry((current) => current + 1)}
      >
        Reintentar
      </Button>
    </div>
  ) : null

  const comandaItemsUpdating = itemsUpdating ? (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2Icon className="size-3.5 animate-spin" />
      Actualizando comanda…
    </p>
  ) : null

  const comandaBody = (
    <>
                <div className="flex flex-wrap gap-1.5">
                  {CHANNELS.map((value) => {
                    const disabled =
                      value === "DELIVERY" || Boolean(activeOrder)
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
                          value === "DELIVERY"
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
                        <ButtonGroup className="w-full">
                          <Button
                            id="pos-table"
                            type="button"
                            variant="outline"
                            className="min-w-0 flex-1 justify-between gap-2"
                            onClick={() => {
                              if (activeOrder && activeTableIds.length === 0) {
                                toast.error("La cuenta no tiene mesas asignadas")
                                return
                              }
                              posCapture.noteComandaInteraction()
                              setTablePickerMode(activeOrder ? "change" : "select")
                              setTablePickerOpen(true)
                            }}
                          >
                            <span className="truncate">
                              {activeOrder
                                ? activeOrder.tables?.length
                                  ? activeOrder.tables
                                      .map((row) => `Mesa ${row.table.number}`)
                                      .join(" + ")
                                  : `Mesa ${activeOrder.tableNumber ?? "—"}`
                                : draftTableIds.length > 0
                                  ? draftTableIds
                                      .map(
                                        (id) =>
                                          `Mesa ${
                                            diningTables.find((table) => table.id === id)
                                              ?.number ?? "—"
                                          }`
                                      )
                                      .join(" + ")
                                  : `Mesa ${tableNumber}`}
                            </span>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label="Juntar mesas"
                            title="Juntar mesas"
                            onClick={() => {
                              posCapture.noteComandaInteraction()
                              setTablePickerMode("merge")
                              setTablePickerOpen(true)
                            }}
                          >
                            <MergeIcon />
                          </Button>
                        </ButtonGroup>
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
                        {guests.length > 1 ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className={cn(
                              "h-7 rounded-full px-2.5 text-xs",
                              activeGuestKey === ALL_GUESTS_KEY &&
                                "ring-2 ring-ring/30"
                            )}
                            aria-pressed={activeGuestKey === ALL_GUESTS_KEY}
                            onClick={() => setActiveGuestKey(ALL_GUESTS_KEY)}
                          >
                            Todos
                          </Button>
                        ) : null}
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

                {!activeOrder &&
                !isDineIn &&
                (displayChannel === "COUNTER" || displayChannel === "PHONE") ? (
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

              {activeGuestKey === ALL_GUESTS_KEY ? (
                <>
                  {itemsLoading ? <ComandaItemsSkeleton /> : null}
                  {comandaItemsError}
                  {comandaItemsUpdating}
                  {allComandaGroups.length === 0 &&
                  !itemsLoading &&
                  !itemsError ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No hay artículos en la comanda.
                    </p>
                  ) : allComandaGroups.length > 0 ? (
                    <ul className="flex flex-col gap-2">
                      {allComandaGroups.map((group) => (
                        <li
                          key={group.key}
                          className="flex flex-col gap-1 rounded-lg border p-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="min-w-0 truncate text-xs font-medium">
                              {group.quantity}× {group.name}
                            </p>
                            <span className="shrink-0 text-xs font-medium tabular-nums">
                              {money(group.total)}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            {group.lines.map((line) => {
                              const guestIndex = guests.findIndex(
                                (guest) => guest.key === line.guestKey
                              )
                              const guestName =
                                guestIndex >= 0
                                  ? guestDisplayName(
                                      guests[guestIndex],
                                      guestIndex
                                    )
                                  : line.guestName?.trim() || "General"
                              const details = [
                                ...line.options.map((option) => option.name),
                                ...line.extras.map((extra) => `+ ${extra.name}`),
                                ...line.excludedNames.map(
                                  (name) => `sin ${name}`
                                ),
                                line.notes ? `“${line.notes}”` : null,
                              ].filter(Boolean)

                              return (
                                <div
                                  key={line.key}
                                  className={cn(
                                    "border-t border-dashed pt-1 text-[10px] text-muted-foreground first:border-0 first:pt-0",
                                    line.sent && "opacity-70"
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="min-w-0 truncate font-medium text-foreground">
                                      {guestName} · {line.quantity}×
                                      {line.sent && line.roundNumber
                                        ? ` · Ronda ${line.roundNumber}`
                                        : ""}
                                    </span>
                                    <span className="shrink-0 tabular-nums">
                                      {money(line.total)}
                                    </span>
                                  </div>
                                  {details.length > 0 ? (
                                    <p className="truncate">
                                      {details.join(" · ")}
                                    </p>
                                  ) : null}
                                </div>
                              )
                            })}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : (
                <>
                  {itemsLoading ? <ComandaItemsSkeleton /> : null}
                  {comandaItemsError}
                  {comandaItemsUpdating}

                  {visibleSentRounds.map(({ round, number, lines }) => (
                    <div key={round.id} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        <span>Ronda {number}</span>
                        <span>
                          {ROUND_STATUS_LABELS[round.status]} ·{" "}
                          {roundTimeLabel(round)}
                        </span>
                      </div>
                      <ul className="flex flex-col gap-1.5">
                        {lines.map((line) => (
                          <SentComandaLine key={line.key} line={line} />
                        ))}
                      </ul>
                    </div>
                  ))}

                  {visibleCart.length > 0 &&
                  (visibleSentRounds.length > 0 ||
                    itemsLoading ||
                    itemsError) ? (
                    <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      <span className="h-px flex-1 bg-border" />
                      Por enviar
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  ) : null}

                  {visibleCart.length > 0 ? (
                    <ul className="flex flex-col gap-1.5">
                      {visibleCart.map((line, index) => (
                        <li
                          key={line.key}
                          className={cn(
                            "flex flex-col gap-0.5",
                            index > 0 && "border-t border-dashed pt-1.5"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-medium">
                                {line.quantity}× {line.itemName}
                                {line.variantName
                                  ? ` ${line.variantName}`
                                  : ""}
                              </p>
                              {line.extras.length > 0 ? (
                                <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
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
                                    className="flex flex-col gap-0.5 text-[10px] text-muted-foreground"
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
                                <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
                                  <span className="font-medium">Sin:</span>
                                  {line.excludedNames.map((name) => (
                                    <span
                                      key={name}
                                      className="min-w-0 truncate"
                                    >
                                      - {name}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                              {line.notes ? (
                                <p className="text-[10px] italic text-muted-foreground">
                                  “{line.notes}”
                                </p>
                              ) : null}
                            </div>
                            <span className="text-xs font-medium tabular-nums">
                              {money(cartLineTotal(line))}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <ButtonGroup
                              aria-label={`Cantidad de ${line.itemName}`}
                            >
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-xs"
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
                                className="h-6 w-8 min-w-8 text-center text-xs tabular-nums"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-xs"
                                aria-label={`Añadir una unidad de ${line.itemName}`}
                                onClick={() => changeQuantity(line.key, 1)}
                              >
                                <PlusIcon />
                              </Button>
                            </ButtonGroup>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="ml-auto"
                              aria-label={`Editar opciones de ${line.itemName}`}
                              onClick={() => openCartLineEditor(line)}
                            >
                              <PencilLineIcon />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              aria-label={`Quitar ${line.itemName} de la comanda`}
                              onClick={() => removeLineWithUndo(line)}
                            >
                              <Trash2Icon />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {!itemsLoading &&
                  !itemsError &&
                  visibleSentRounds.length === 0 &&
                  visibleCart.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      {cart.length === 0 && sentLines.length === 0
                        ? "Elige artículos del catálogo para armar la ronda."
                        : "Este cliente no tiene artículos en la comanda."}
                    </p>
                  ) : null}
                </>
              )}
    </>
  )

  const comandaSummary = (
    <>
      <div className="flex flex-col gap-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">
                    {money(comandaSubtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">IVA</span>
                  <span className="tabular-nums">{money(comandaTax)}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-1">
                  <span className="font-medium">Total</span>
                  <span className="text-base font-semibold tabular-nums">
                    {money(comandaTotal)}
                  </span>
                </div>
                {activeOrder && cart.length > 0 ? (
                  <p className="text-[10px] text-muted-foreground">
                    Incluye {money(total)} de la nueva ronda sin enviar.
                  </p>
                ) : null}
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
                      Saldo {money(saldoConCaptura)}
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

  const handleTableConfirm = (ids: string[]) => {
    if (ids.length === 0) return

    if (!activeOrder) {
      const nextIds = tablePickerMode === "merge" ? ids : ids.slice(0, 1)
      const table = diningTables.find((entry) => entry.id === nextIds[0])
      if (!table) return
      setDraftTableIds(nextIds)
      setTableId(table.id)
      setTableNumber(table.number)
      return
    }

    const nextIds = tablePickerMode === "change" ? ids.slice(0, 1) : ids
    const selectedTables = diningTables.filter((table) =>
      nextIds.includes(table.id)
    )
    const primary = selectedTables[0]

    if (!primary) return

    const orderBeingChanged = activeOrder
    const previousNumber = orderBeingChanged.tableNumber
    const previousTables = orderBeingChanged.tables
    const endLocalPerf = startPosPerf("table-change.local")

    // La cabecera y el deck cambian al instante; la API confirma después.
    patchOrderLocal(orderBeingChanged.id, {
      tableNumber: primary.number,
      tables: selectedTables.map((table, index) => ({
        id: `local-${table.id}`,
        isPrimary: index === 0,
        table,
      })),
    })
    setTableNumber(primary.number)
    endLocalPerf({ tables: selectedTables.length })

    void (async () => {
      const endApiPerf = startPosPerf("table-change.api")

      try {
        const result = await updateOrderTables(orderBeingChanged.id, nextIds)

        if (!result.ok || !result.data) {
          patchOrderLocal(orderBeingChanged.id, {
            tableNumber: previousNumber,
            tables: previousTables,
          })
          setTableNumber(previousNumber ?? "1")
          toast.error(result.message ?? "No se pudieron actualizar las mesas")
          return
        }

        patchOrderLocal(orderBeingChanged.id, {
          tableNumber: result.data.tableNumber,
          tables: result.data.tables,
          updatedAt: result.data.updatedAt,
        })
        setTableNumber(result.data.tableNumber ?? "1")

        toast.success(
          tablePickerMode === "change" ? "Mesa cambiada" : "Mesas juntadas"
        )
      } catch {
        patchOrderLocal(orderBeingChanged.id, {
          tableNumber: previousNumber,
          tables: previousTables,
        })
        setTableNumber(previousNumber ?? "1")
        toast.error("No se pudieron actualizar las mesas")
      } finally {
        endApiPerf({ tables: nextIds.length })
      }
    })()
  }

  const handleMergeOrder = (sourceOrderId: string) => {
    setTablePickerOpen(false)
    setMergeAccountOrderId(sourceOrderId)
  }

  const confirmMergeAccount = async () => {
    if (!activeOrder || !mergeAccountOrderId) return

    const result = await mergeOrders(activeOrder.id, mergeAccountOrderId)

    if (!result.ok) {
      toast.error(result.message ?? "No se pudieron juntar las cuentas")
      return
    }

    toast.success("Cuentas juntadas · puedes cobrar todo o por cuenta")
    setMergeAccountOrderId(null)
    void refreshOrders()
  }

  const openPendingPayment = () => {
    if (!activeOrder) return
    setChargeOrder(activeOrder)
    setCharging(true)
  }

  const handlePayAndSend = () => {
    if (cart.length === 0) {
      if (pendingPaymentRound) {
        openPendingPayment()
        return
      }

      toast.error("Añade al menos un artículo")
      return
    }

    void handleSend(true)
  }

  const releasePayFirstRound = async () => {
    const target = chargeOrder ?? activeOrder

    if (!target) return

    const ids = new Set<string>()

    for (const round of target.rounds ?? []) {
      if (round.status === "PENDING_PAYMENT") ids.add(round.id)
    }

    if (payFirstRoundId) ids.add(payFirstRoundId)

    if (ids.size === 0) return

    for (const roundId of ids) {
      const result = await releasePaymentRound(target.id, roundId)

      if (!result.ok) {
        toast.error(
          result.message ??
            "El pago se confirmó, pero no se pudo enviar a cocina. Usa Cobrar pendiente."
        )
        void refreshOrders()
        void refreshServiceData()
        return
      }
    }

    toast.success("Pago confirmado · pedido enviado a cocina")
    setPayFirstRoundId(null)
    void refreshOrders()
    void refreshServiceData()
  }

  const handleChargeAllMerged = async () => {
    if (!activeOrder) return

    if (cart.length > 0) {
      toast.info("Envía la nueva ronda antes de cobrar.", {
        description:
          "El cobro se genera con los artículos ya guardados en la cuenta.",
      })
      return
    }

    const result = await cancelOrderSplits(activeOrder.id)

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo unir la cuenta para cobrar")
      return
    }

    setChargeOrder({ ...activeOrder, splits: [] })
    setCharging(true)
  }

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
  const splitAccounts = activeOrder?.splits ?? []
  const hasMergedAccounts = splitAccounts.length > 1
  const hasSplitPayments = splitAccounts.some(
    (split) => split.paidAmount > 0 || split.pendingAmount > 0
  )
  const isTableServiceOrder =
    !activeOrder?.isTakeaway &&
    (activeOrder?.channel ?? "DINE_IN") === "DINE_IN"
  const canPrintAccount =
    canPrintReceipt &&
    Boolean(activeOrder) &&
    (hasConfirmedPayments || isTableServiceOrder)

  const comandaActions = (
    <div className="flex flex-col gap-2">
      {canSend ? (
                <>
                  {displayChannel === "COUNTER" ? (
                    <>
                      <div className="flex gap-2">
                        {!orderId ? (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={
                              sending ||
                              savingDraft ||
                              !offline.isOnline ||
                              cart.length === 0
                            }
                            onClick={() => void handleSaveDraft()}
                          >
                            {savingDraft ? (
                              <Loader2Icon className="animate-spin" />
                            ) : (
                              <SaveIcon />
                            )}
                            Guardar
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          className="min-w-0 flex-1 justify-center gap-3"
                          onClick={handlePayAndSend}
                          disabled={
                            sending ||
                            !canConfirm ||
                            !cash.session ||
                            !offline.isOnline ||
                            (cart.length === 0 && !pendingPaymentRound)
                          }
                          title={
                            !cash.session
                              ? "Abre la caja para cobrar"
                              : !offline.isOnline
                                ? "Conecta el dispositivo para cobrar y enviar"
                                : undefined
                          }
                        >
                          {sending ? (
                            <Loader2Icon className="animate-spin" />
                          ) : null}
                          <span>
                            {pendingPaymentRound && cart.length === 0
                              ? "Cobrar pendiente"
                              : "Cobrar y enviar"}
                          </span>
                          <span className="border-l pl-3 tabular-nums">
                            {money(payFirstAmount)}
                          </span>
                        </Button>
                      </div>
                      {!cash.session ? (
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Abre la caja para cobrar y enviar a cocina.
                        </p>
                      ) : null}
                      {!canConfirm ? (
                        <p className="text-xs text-muted-foreground">
                          Caja o administración deben cobrar este pedido.
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        {!orderId && offline.isOnline ? (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={
                              sending || savingDraft || cart.length === 0
                            }
                            onClick={() => void handleSaveDraft()}
                          >
                            {savingDraft ? (
                              <Loader2Icon className="animate-spin" />
                            ) : (
                              <SaveIcon />
                            )}
                            Guardar
                          </Button>
                        ) : null}
                        <Button
                          variant={orderId ? "secondary" : "default"}
                          className="min-w-0 flex-1"
                          onClick={() => void handleSend(false)}
                          disabled={sending || cart.length === 0}
                        >
                          {sending ? (
                            <Loader2Icon className="animate-spin" />
                          ) : null}
                          {offline.isOnline
                            ? orderId
                              ? "Enviar ronda"
                              : "Abrir cuenta y enviar"
                            : "Guardar comanda sin conexión"}
                        </Button>
                      </div>
                      {!offline.isOnline ? (
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Cocina no recibirá la comanda hasta que vuelva la conexión.
                        </p>
                      ) : null}
                      {kitchenAdvanced ? (
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Switch
                              checked={holdRound}
                              onCheckedChange={setHoldRound}
                              disabled={!offline.isOnline || sending}
                            />
                            Mantener para después
                          </label>
                        </div>
                      ) : null}
                    </>
                  )}
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
                      variant="default"
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
                        if (cart.length > 0) {
                          toast.info(
                            "Envía la nueva ronda antes de cobrar.",
                            {
                              description:
                                "El cobro se genera con los artículos ya guardados en la cuenta.",
                            }
                          )
                          return
                        }

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

                        if (offline.isOnline) {
                          setChargeOrder(activeOrder)
                          setCharging(true)
                        } else {
                          setOfflineCharging(true)
                        }
                      }}
                    >
                      {offline.isOnline ? <CreditCardIcon /> : <BanknoteIcon />}
                      {offline.isOnline
                        ? hasMergedAccounts
                          ? "Cobrar por cuenta"
                          : "Cobrar cuenta"
                        : "Cobrar sin conexión"}
                    </Button>
                    {hasMergedAccounts && offline.isOnline && !hasSplitPayments ? (
                      <Button
                        variant="outline"
                        onClick={() => void handleChargeAllMerged()}
                      >
                        Cobrar todo
                      </Button>
                    ) : null}
                    {canPrintAccount ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
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
    </div>
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
  const mobileToolsMenu = React.useMemo(
    () => (
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
          <DropdownMenuSubTrigger className="md:hidden">
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
              <DropdownMenuLabel>Imágenes</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={showImages}
                closeOnClick={false}
                onCheckedChange={setShowImages}
              >
                Mostrar imágenes
              </DropdownMenuCheckboxItem>
            </DropdownMenuGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {canManageCash ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="md:hidden">
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
    ),
    [
      selectedMenu,
      menus,
      menuId,
      setMenuId,
      sortOrder,
      setSortOrder,
      cardColumns,
      setCardColumns,
      cardTextSize,
      setCardTextSize,
      squareCards,
      setSquareCards,
      showImages,
      setShowImages,
      cash.session,
      canManageCash,
      cashClosePending,
    ]
  )

  const viewControl = React.useMemo(
    () => (
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
          <PosViewFields
            cardColumns={cardColumns}
            setCardColumns={setCardColumns}
            cardTextSize={cardTextSize}
            setCardTextSize={setCardTextSize}
            squareCards={squareCards}
            setSquareCards={setSquareCards}
            showImages={showImages}
            setShowImages={setShowImages}
          />
        </PopoverContent>
      </Popover>
    ),
    [
      cardColumns,
      cardTextSize,
      squareCards,
      showImages,
      setCardColumns,
      setCardTextSize,
      setSquareCards,
      setShowImages,
    ]
  )

  const sortControl = React.useMemo(
    () => (
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
              onValueChange={(value) => setSortOrder(value as PosSortOrder)}
            >
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    [sortOrder, setSortOrder]
  )

  const filtersToolbar = React.useMemo(
    () => (
          <div className="filtros-mobile flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex min-w-0 items-center gap-2 sm:flex-1 xl:flex-none">
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

              {isPhone ? (
                <div className="md:hidden">{mobileToolsMenu}</div>
              ) : null}
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
                <SelectTrigger className="w-44" aria-label="Filtrar por menú">
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

            <div className="flex flex-wrap items-center gap-2 max-xl:hidden">
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
                  <PosViewFields
                    cardColumns={cardColumns}
                    setCardColumns={setCardColumns}
                    cardTextSize={cardTextSize}
                    setCardTextSize={setCardTextSize}
                    squareCards={squareCards}
                    setSquareCards={setSquareCards}
                    showImages={showImages}
                    setShowImages={setShowImages}
                  />
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
    ),
    [
      search,
      menuId,
      menus,
      setMenuId,
      mobileToolsMenu,
      isPhone,
      sortOrder,
      setSortOrder,
      cardColumns,
      setCardColumns,
      cardTextSize,
      setCardTextSize,
      squareCards,
      setSquareCards,
      showImages,
      setShowImages,
      cash.session,
      cash.summary,
      canManageCash,
    ]
  )

  return (
    <PosRenderProfiler id="PosView">
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 pb-24 max-lg:landscape:pb-20 lg:px-6 xl:pb-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-3">
          {!isDesktopClient ? (
            <div className="comanda-tablet">
              <div className="comanda-tablet-tools">
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
                  <SelectTrigger className="w-full" aria-label="Filtrar por menú">
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

                <div className="grid grid-cols-2 gap-2 [&_[data-slot=button]]:w-full">
                  {sortControl}
                  {viewControl}
                </div>

                {canManageCash ? (
                  <div className="w-full [&>[data-slot=button]]:w-full [&_[data-slot=button-group]]:w-full [&_[data-slot=button-group]>[data-slot=button]:first-child]:flex-1">
                    <CashSessionActions
                      session={cash.session}
                      summary={cash.summary}
                      canManage={canManageCash}
                    />
                  </div>
                ) : null}
              </div>

              <Card className="flex w-full min-w-0 flex-col gap-3 overflow-hidden border p-4 ring-0">
              <div className="comanda-rapida-mobile flex min-w-0 flex-col gap-2 rounded-lg">
              <div className="flex flex-wrap gap-1.5">
                {CHANNELS.map((value) => {
                  const disabled =
                    value === "DELIVERY" || Boolean(activeOrder)
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
                        value === "DELIVERY"
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
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                    <div className="flex flex-col gap-1">
                      <Label
                        htmlFor="mobile-pos-table"
                        className="text-xs text-muted-foreground"
                      >
                        Mesa
                      </Label>
                      <ButtonGroup className="w-full">
                        <Button
                          id="mobile-pos-table"
                          type="button"
                          variant="outline"
                          className="h-8 min-w-0 flex-1 justify-between gap-2 px-2 text-xs"
                          onClick={() => {
                            if (activeOrder && activeTableIds.length === 0) {
                              toast.error("La cuenta no tiene mesas asignadas")
                              return
                            }
                            posCapture.noteComandaInteraction()
                            setTablePickerMode(activeOrder ? "change" : "select")
                            setTablePickerOpen(true)
                          }}
                        >
                          <span className="truncate">
                            {activeOrder
                              ? activeOrder.tables?.length
                                ? activeOrder.tables
                                    .map((row) => `M${row.table.number}`)
                                    .join("+")
                                : `M${activeOrder.tableNumber ?? "—"}`
                              : draftTableIds.length > 0
                                ? draftTableIds
                                    .map(
                                      (id) =>
                                        `M${
                                          diningTables.find((table) => table.id === id)
                                            ?.number ?? "—"
                                        }`
                                    )
                                    .join("+")
                                : `Mesa ${tableNumber}`}
                          </span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="h-8"
                          aria-label="Juntar mesas"
                          title="Juntar mesas"
                          onClick={() => {
                            posCapture.noteComandaInteraction()
                            setTablePickerMode("merge")
                            setTablePickerOpen(true)
                          }}
                        >
                          <MergeIcon />
                        </Button>
                      </ButtonGroup>
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
              ) : displayChannel === "COUNTER" || displayChannel === "PHONE" ? (
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
                </div>
              </Card>
            </div>
          ) : null}

          <PosCatalog
            key={menuId}
            toolbar={filtersToolbar}
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
            showImages={showImages}
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
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <ButtonGroup
                aria-label="Comandas y pedidos"
                className="h-8 overflow-hidden rounded-full border bg-card p-0 shadow-xs"
              >
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 gap-1.5 rounded-none px-2"
                  aria-label={`Comandas guardadas (${draftCount})`}
                  title="Comandas guardadas"
                  onClick={() => {
                    setDraftsOpen(true)
                    void refreshServiceData()
                  }}
                >
                  <SaveCheckIcon className="size-4" />
                  <span
                    className={cn(
                      "text-xs font-semibold tabular-nums",
                      draftCount > 0 ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {draftCount}
                  </span>
                </Button>
                <Separator
                  orientation="vertical"
                  className="h-5 self-center!"
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 gap-1.5 rounded-none px-2"
                  aria-label={`Pedidos listos (${readyQueueRounds.length})`}
                  title="Pedidos listos"
                  onClick={() => openServiceQueue("ready")}
                >
                  <ConciergeBellIcon className="size-4" />
                  <span
                    className={cn(
                      "text-xs font-semibold tabular-nums",
                      readyQueueRounds.length > 0
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {readyQueueRounds.length}
                  </span>
                </Button>
                <Separator
                  orientation="vertical"
                  className="h-5 self-center!"
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 gap-1.5 rounded-none px-2"
                  aria-label={`Cuentas abiertas (${openAccounts.length})`}
                  title="Cuentas abiertas"
                  onClick={() => openServiceQueue("pending")}
                >
                  <BanknoteXIcon className="size-4" />
                  <span
                    className={cn(
                      "text-xs font-semibold tabular-nums",
                      openAccounts.length > 0
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {openAccounts.length}
                  </span>
                </Button>
              </ButtonGroup>

              <div className="ml-auto flex items-center gap-1.5">
                <Button
                  type="button"
                  className="h-8 gap-1.5 rounded-full px-2.5 shadow-xs"
                  aria-label={`Pedido actual${
                    newDraftUnits > 0 ? ` (${newDraftUnits} artículos)` : ""
                  }`}
                  title="Volver al pedido actual"
                  onClick={() => {
                    if (orderId) selectOrder("")
                  }}
                >
                  <PencilLineIcon className="size-4" />
                  <span className="text-xs font-medium">Pedido actual</span>
                  {newDraftUnits > 0 ? (
                    <span className="text-xs font-bold tabular-nums">
                      {newDraftUnits}
                    </span>
                  ) : null}
                </Button>
              </div>
            </div>
            {comandaPanel}
          </div>
        ) : null}
      </div>

      {!isDesktopClient ? (
        <>
          <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex items-center justify-between gap-2 px-3 max-lg:landscape:bottom-4 lg:bottom-6 xl:hidden">
            <ButtonGroup
              aria-label="Comandas y pedidos"
              className="pointer-events-auto h-12 md:h-14 overflow-hidden rounded-full border bg-card p-0 shadow-lg shadow-black/10"
            >
              <Button
                type="button"
                variant="ghost"
              className="h-12 md:h-14 gap-1.5 md:gap-2 rounded-none px-2 md:px-3"
                aria-label={`Comandas guardadas (${draftCount})`}
                title="Comandas guardadas"
                onClick={() => {
                  setDraftsOpen(true)
                  void refreshServiceData()
                }}
              >
                <SaveCheckIcon className="size-4 md:size-5" />
                <span
                  className={cn(
                    "text-xs md:text-sm font-semibold tabular-nums",
                    draftCount > 0 ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {draftCount}
                </span>
              </Button>
              <Separator orientation="vertical" className="h-6 md:h-8 self-center!" />
              <Button
                type="button"
                variant="ghost"
              className="h-12 md:h-14 gap-1.5 md:gap-2 rounded-none px-2 md:px-3"
                aria-label={`Pedidos listos (${readyQueueRounds.length})`}
                title="Pedidos listos"
                onClick={() => openServiceQueue("ready")}
              >
                <ConciergeBellIcon className="size-4 md:size-5" />
                <span
                  className={cn(
                    "text-xs md:text-sm font-semibold tabular-nums",
                    readyQueueRounds.length > 0
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {readyQueueRounds.length}
                </span>
              </Button>
              <Separator orientation="vertical" className="h-6 md:h-8 self-center!" />
              <Button
                type="button"
                variant="ghost"
              className="h-12 md:h-14 gap-1.5 md:gap-2 rounded-none px-2 md:px-3"
                aria-label={`Cuentas abiertas (${openAccounts.length})`}
                title="Cuentas abiertas"
                onClick={() => openServiceQueue("pending")}
              >
                <BanknoteXIcon className="size-4 md:size-5" />
                <span
                  className={cn(
                    "text-xs md:text-sm font-semibold tabular-nums",
                    openAccounts.length > 0
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {openAccounts.length}
                </span>
              </Button>
            </ButtonGroup>

            <Button
              type="button"
              className="pointer-events-auto h-12 md:h-14 gap-1.5 md:gap-2 rounded-full px-2.5 md:px-3 shadow-lg shadow-black/10"
              aria-label="Ver pedido actual"
              onClick={() => setComandaOpen(true)}
            >
              <PencilLineIcon data-icon="inline-start" className="size-4 md:size-5" />
              <span className="hidden font-medium min-[350px]:inline md:text-base">
                Pedido
              </span>
              {comandaUnits > 0 ? (
                <span className="text-sm md:text-base font-bold text-primary-foreground tabular-nums">
                  {comandaUnits}
                </span>
              ) : null}
            </Button>
          </div>

          {!showComandaColumn ? (
            <Sheet open={comandaOpen} onOpenChange={setComandaOpen}>
              <SwipeableSheetContent
                side="bottom"
                showCloseButton={false}
                onOpenChange={setComandaOpen}
                className="h-dvh! gap-0 overflow-hidden rounded-none border-0! p-0"
              >
                <SheetTitle className="sr-only">Comanda</SheetTitle>
                <SheetDescription className="sr-only">
                  Revisa la cuenta y envía la ronda a cocina.
                </SheetDescription>
                {comandaPanel}
              </SwipeableSheetContent>
            </Sheet>
          ) : null}
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

      <TablePicker
        key={`${tablePickerMode}-${tablePickerOpen ? "open" : "closed"}-${activeTableIds.join("|")}`}
        open={tablePickerOpen}
        onOpenChange={setTablePickerOpen}
        tables={tablePickerTables}
        mode={tablePickerMode}
        currentOrderId={activeOrder?.id ?? null}
        currentTableIds={activeTableIds}
        onConfirm={handleTableConfirm}
        onMergeOrder={handleMergeOrder}
      />

      <PosDraftsSheet
        open={draftsOpen}
        onOpenChange={setDraftsOpen}
        onResume={handleResumeDraft}
        drafts={serviceDrafts}
        onDraftsChange={setServiceDrafts}
        onRefresh={() => void refreshServiceData()}
        side={showComandaColumn ? "right" : "bottom"}
      />

      <PosServiceQueueSheet
        open={serviceQueueMode !== null}
        mode={serviceQueueMode ?? "kitchen"}
        onOpenChange={(open) => {
          if (!open) setServiceQueueMode(null)
        }}
        rounds={serviceRounds}
        orders={openAccounts}
        onPrintOrder={handlePrintQueueOrder}
        onChargeOrder={handleChargeQueueOrder}
        onCloseOrder={handleCloseQueueOrder}
        onDeliverRound={handleDeliverQueueRound}
        onCancelRound={handleCancelQueueRound}
        onPrioritizeRound={handlePrioritizeQueueRound}
        onEditOrder={handleEditQueueOrder}
        canPrintReceipt={canPrintReceipt}
        canCloseOrder={canConfirm}
        loading={serviceRoundsLoading}
        side={showComandaColumn ? "right" : "bottom"}
      />

      <AlertDialog
        open={Boolean(mergeAccountOrderId)}
        onOpenChange={(open) => !open && setMergeAccountOrderId(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Link2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>¿Juntar las cuentas?</AlertDialogTitle>
            <AlertDialogDescription>
              Las rondas y clientes de la otra cuenta se moverán a esta. Podrás
              cobrar todo junto o por cuenta desde el diálogo de cobro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmMergeAccount()}
            >
              Juntar cuentas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {charging && dialogOrder ? (
        <ChargeDialog
          order={dialogOrder}
          canConfirm={canConfirm}
          mercadoPago={mercadoPago}
          initialSummary={
            chargeSnapshot.current.get(chargeSummaryCacheKey(dialogOrder)) ??
            null
          }
          displayTipPercent={displayState?.tipPercent ?? null}
          onFullyPaid={() => void releasePayFirstRound()}
          onClose={() => {
            const fromQueue = queueChargeRef.current
            queueChargeRef.current = false

            setCharging(false)
            setChargeOrder(null)
            if (!fromQueue) setPendingOrder(null)
            // Los cobros se reflejan en el diálogo sin revalidar el POS; al
            // cerrarlo se trae solo la lista de cuentas con los saldos reales.
            void refreshOrders()
            void refreshServiceData()
          }}
          onDone={() => {
            const fromQueue = queueChargeRef.current
            queueChargeRef.current = false

            setCharging(false)
            setChargeOrder(null)

            if (!fromQueue) {
              setPayFirstRoundId(null)
              setPendingOrder(null)
              setOrderId("")
              setCart([])
              setGuests([{ key: newGuestKey(), name: "", savedName: "", sex: null, ageRange: null }])
              setPartySize(1)
              setActiveGuestKey(null)
              setTableNumber("1")
              setTableId("")
              setDraftTableIds([])
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
            }

            void refreshOrders()
            void refreshServiceData()
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
    </PosRenderProfiler>
  )
}

function ComandaLineDetails({ line }: { line: ComandaLine }) {
  const money = useMoney()

  return (
    <>
      {line.extras.length > 0 ? (
        <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
          <span className="font-medium">Extras:</span>
          {line.extras.map((extra) => (
            <div
              key={extra.id}
              className="flex items-baseline justify-between gap-3"
            >
              <span className="min-w-0 truncate">- {extra.name}</span>
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

      {groupCartOptions(line.options).map(([groupName, options]) => (
        <div
          key={groupName}
          className="flex flex-col gap-0.5 text-[10px] text-muted-foreground"
        >
          <span className="font-medium">{groupName}:</span>
          {options.map((option, index) => (
            <div
              key={`${groupName}-${option.itemOptionValueId ?? option.name}-${index}`}
              className="flex items-baseline justify-between gap-3"
            >
              <span className="min-w-0 truncate">- {option.name}</span>
              {option.price !== 0 ? (
                <span className="shrink-0 tabular-nums">
                  {option.price > 0 ? "+" : "−"}
                  {money(Math.abs(option.price))}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ))}

      {line.excludedNames.length > 0 ? (
        <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
          <span className="font-medium">Sin:</span>
          {line.excludedNames.map((name) => (
            <span key={name} className="min-w-0 truncate">
              - {name}
            </span>
          ))}
        </div>
      ) : null}

      {line.notes ? (
        <p className="text-[10px] italic text-muted-foreground">
          “{line.notes}”
        </p>
      ) : null}
    </>
  )
}

/** Artículo ya enviado: visible, pero sin controles de edición. */
function SentComandaLine({ line }: { line: ComandaLine }) {
  const money = useMoney()

  return (
    <li className="flex flex-col gap-0.5 opacity-70">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium">
            {line.quantity}× {line.itemName}
            {line.variantName ? ` ${line.variantName}` : ""}
          </p>
          <ComandaLineDetails line={line} />
        </div>
        <span className="shrink-0 text-xs font-medium tabular-nums">
          {money(line.total)}
        </span>
      </div>
    </li>
  )
}

function ComandaItemsSkeleton() {
  return (
    <div className="flex flex-col gap-2 py-1" aria-busy="true">
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex flex-col gap-1">
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted" />
        </div>
      ))}
      <span className="text-[10px] text-muted-foreground">
        Cargando artículos de la cuenta…
      </span>
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
