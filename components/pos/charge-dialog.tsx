"use client"

import * as React from "react"
import {
  ArrowLeftRightIcon,
  BanknoteIcon,
  CheckCircle2Icon,
  CheckIcon,
  CircleAlertIcon,
  CreditCardIcon,
  HandCoinsIcon,
  Loader2Icon,
  LockIcon,
  ReceiptTextIcon,
  RefreshCwIcon,
  SmartphoneIcon,
  Undo2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useMoney } from "@/lib/currency"
import { getChargeSummary } from "@/lib/order-actions"
import {
  createOrderSplits,
  getOrderSplits,
  replaceOrderSplits,
} from "@/lib/split-actions"
import {
  closeOrder,
  confirmPayment,
  registerPayment,
  voidPayment,
} from "@/lib/payment-actions"
import {
  orderLabel,
  PAYMENT_METHOD_LABELS,
  type ChargeSummary,
  type Order,
  type OrderSplit,
  type PaymentMethod,
  type PaymentStatus,
  type TipSource,
} from "@/lib/orders"
import { jalapenoChipClass } from "@/lib/chips"
import {
  cancelPointCharge,
  chargeWithPoint,
  syncPointPayment,
  type PointPayment,
} from "@/lib/mercadopago-actions"
import type { MercadoPagoPointConfig } from "@/lib/mercadopago"
import { cn } from "@/lib/utils"

const BASE_METHODS: PaymentMethod[] = ["CASH", "CARD", "TRANSFER"]

const PROVIDER_DETAIL_LABELS: Record<string, string> = {
  rejected_by_issuer: "Rechazado por el banco emisor",
  insufficient_amount: "Fondos insuficientes",
  bad_filled_card_data: "Datos de la tarjeta incorrectos",
  high_risk: "Rechazado por riesgo",
  processing_error: "Error de procesamiento",
  canceled_on_terminal: "Cancelado en la terminal",
  canceled_by_api: "Cancelado desde la app",
  expired: "Expiró el tiempo para pagar",
  failed: "Pago rechazado",
}

/** Icono de cada método de pago (las cards del paso 2). */
const METHOD_ICONS: Record<PaymentMethod, typeof BanknoteIcon> = {
  CASH: BanknoteIcon,
  CARD: CreditCardIcon,
  TRANSFER: ArrowLeftRightIcon,
  MERCADO_PAGO_POINT: SmartphoneIcon,
}

type ChargeStep = "review" | "payment" | "tip" | "close"

/** Hora local de un cobro, para la lista de pendientes. */
function paymentTime(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ""

  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

/** Pago mínimo que necesita el diálogo (resumen del servidor o registro local). */
interface ChargePayment {
  id: string
  method: PaymentMethod
  amount: string
  tipAmount?: string
  status: PaymentStatus
  splitId?: string | null
  provider?: string | null
  createdAt?: string
  confirmedAt?: string | null
}

const STEPS: { id: ChargeStep; label: string }[] = [
  { id: "review", label: "Repaso" },
  { id: "payment", label: "Pago" },
  { id: "tip", label: "Propina" },
  { id: "close", label: "Cierre" },
]

const STEP_ICONS: Record<ChargeStep, typeof BanknoteIcon> = {
  review: ReceiptTextIcon,
  payment: CreditCardIcon,
  tip: HandCoinsIcon,
  close: LockIcon,
}

export function ChargeDialog({
  order,
  canConfirm,
  mercadoPago,
  defaultTipPercent = 0,
  displayTipPercent = null,
  initialSummary = null,
  onClose,
  onClosed,
}: {
  order: Order
  canConfirm: boolean
  mercadoPago: MercadoPagoPointConfig
  /** Porcentaje de propina sugerido por la sucursal (0 = sin sugerencia). */
  defaultTipPercent?: number
  /** Propina elegida por el cliente en la pantalla, si la hay. */
  displayTipPercent?: number | null
  /** Resumen precargado por el POS para abrir el diálogo sin esperar. */
  initialSummary?: ChargeSummary | null
  onClose: () => void
  onClosed: () => void
}) {
  const money = useMoney()

  /**
   * Cobros hechos en este diálogo que la prop `order` todavía no refleja.
   *
   * Registrar o confirmar un pago ya no revalida el POS, así que el saldo y las
   * partes se ajustan aquí; al cerrar el diálogo el padre refresca la cuenta.
   */
  const [localPayments, setLocalPayments] = React.useState<ChargePayment[]>([])

  const methods: PaymentMethod[] = React.useMemo(
    () =>
      mercadoPago.enabled
        ? [...BASE_METHODS, "MERCADO_PAGO_POINT"]
        : BASE_METHODS,
    [mercadoPago.enabled]
  )

  const [method, setMethod] = React.useState<PaymentMethod>("CASH")
  const [terminalId, setTerminalId] = React.useState(
    () =>
      mercadoPago.terminals.find((terminal) => terminal.isDefault)?.id ??
      mercadoPago.terminals[0]?.id ??
      ""
  )
  const initialSplit =
    initialSummary?.splits.find((split) => split.remainingAmount > 0) ??
    initialSummary?.splits[0] ??
    null
  const initialSummaryRef = React.useRef(initialSummary)
  const [amountInput, setAmountInput] = React.useState<string | null>(
    initialSplit && initialSplit.remainingAmount > 0
      ? initialSplit.remainingAmount.toFixed(2)
      : null
  )
  const initialTipPercent = displayTipPercent ?? defaultTipPercent
  const [tipInput, setTipInput] = React.useState(() =>
    initialTipPercent > 0
      ? (
          (Math.max(Number(order.balance ?? order.total), 0) *
            initialTipPercent) /
          100
        ).toFixed(2)
      : ""
  )
  const [tipPercentValue, setTipPercentValue] = React.useState<number | null>(
    initialTipPercent > 0 ? initialTipPercent : null
  )
  const [tipSource, setTipSource] = React.useState<TipSource>(
    displayTipPercent && displayTipPercent > 0
      ? "CUSTOMER_DISPLAY"
      : defaultTipPercent > 0
        ? "SUGGESTED"
        : "NONE"
  )
  const [cashInput, setCashInput] = React.useState("")
  const [pending, setPending] = React.useState<string | null>(null)
  const [splits, setSplits] = React.useState<OrderSplit[]>(
    initialSummary?.splits ?? []
  )
  const [splitBusy, setSplitBusy] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<
    "COMBINED" | "BY_GUEST" | "EQUAL"
  >(
    initialSplit
      ? initialSplit.mode === "EQUAL"
        ? "EQUAL"
        : "BY_GUEST"
      : "COMBINED"
  )
  const [equalParts, setEqualParts] = React.useState("2")
  const [activeSplitId, setActiveSplitId] = React.useState<string | null>(
    initialSplit && initialSplit.remainingAmount > 0
      ? initialSplit.id
      : null
  )
  const [pointPayment, setPointPayment] =
    React.useState<PointPayment | null>(null)
  const [pointTimedOut, setPointTimedOut] = React.useState(false)
  const pointDeadline = React.useRef<number | null>(null)
  /** Pago pendiente que se está anulando (abre el diálogo de motivo). */
  const [voidTarget, setVoidTarget] = React.useState<ChargePayment | null>(null)
  const [voidReason, setVoidReason] = React.useState("")
  /**
   * Clave de idempotencia del intento en curso.
   *
   * Se reutiliza mientras el cobro siga vivo para que reintentar no envíe dos
   * órdenes a la terminal; se descarta al confirmar o cancelar.
   */
  const pointKey = React.useRef<string | null>(null)
  const pointPending = pointPayment?.status === "PENDING"
  /** La terminal cobra la venta más la propina en una sola operación. */
  const pointTotal = pointPayment
    ? Number(pointPayment.amount) + Number(pointPayment.tipAmount ?? 0)
    : 0
  const [step, setStep] = React.useState<ChargeStep>("review")
  const [detail, setDetail] = React.useState<ChargeSummary | null>(
    initialSummary
  )
  const [detailLoading, setDetailLoading] = React.useState(!initialSummary)
  const [detailError, setDetailError] = React.useState(false)
  /** `all`, `__general__` o el id de un cliente. */
  const [reviewFilter, setReviewFilter] = React.useState(
    initialSplit?.guestId ?? "all"
  )

  /**
   * Estado de cobro unificado: lo que trae el servidor más lo que se hizo en
   * este diálogo (el registro local gana por `id`).
   */
  const payments = React.useMemo(() => {
    const merged = new Map<string, ChargePayment>()

    // La lista del POS puede venir atrasada; el resumen recién leído gana.
    for (const payment of order.payments ?? []) {
      merged.set(payment.id, payment as ChargePayment)
    }

    for (const payment of detail?.payments ?? []) {
      merged.set(payment.id, payment as ChargePayment)
    }

    for (const payment of localPayments) {
      merged.set(payment.id, payment)
    }

    return [...merged.values()]
  }, [detail?.payments, order.payments, localPayments])

  const confirmedTotal = payments
    .filter((payment) => payment.status === "CONFIRMED")
    .reduce((sum, payment) => sum + Number(payment.amount), 0)
  const pendingTotal = payments
    .filter((payment) => payment.status === "PENDING")
    .reduce((sum, payment) => sum + Number(payment.amount), 0)
  const balance = Math.max(Number(order.total) - confirmedTotal, 0)
  /** Lo que de verdad se puede cobrar: el saldo menos lo pendiente. */
  const available = Math.max(balance - pendingTotal, 0)
  const pendingPayments = payments.filter(
    (payment) => payment.status === "PENDING"
  )

  // El repaso necesita los artículos; la lista del POS solo trae conteos.
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    let cancelled = false

    if (!initialSummaryRef.current) setDetailLoading(true)
    setDetailError(false)

    getChargeSummary(order.id).then((result) => {
      if (cancelled) return

      if (result.ok && result.data) {
        const summary = result.data
        setDetail(summary)
        setSplits(summary.splits)

        const guestList = summary.guests ?? []
        const items = summary.rounds.flatMap((round) => round.items)

        if (summary.splits.length > 0) {
          const first =
            summary.splits.find((split) => split.remainingAmount > 0) ??
            summary.splits[0]

          setViewMode(first.mode === "EQUAL" ? "EQUAL" : "BY_GUEST")

          if (first.remainingAmount > 0) {
            setActiveSplitId(first.id)
            setAmountInput(first.remainingAmount.toFixed(2))
            setReviewFilter(first.guestId ?? "all")
          }
        } else {
          setViewMode("COMBINED")
          setActiveSplitId(null)

          if (guestList.length === 1) {
            const guest = guestList[0]
            const hasGuestItems = items.some(
              (item) => item.guestId === guest.id
            )
            const hasGeneralItems = items.some((item) => !item.guestId)

            setReviewFilter(
              hasGuestItems || !hasGeneralItems ? guest.id : "__general__"
            )
          } else {
            setReviewFilter("all")
          }
        }
      } else {
        setDetailError(true)
      }

      setDetailLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [order.id])
  /* eslint-enable react-hooks/set-state-in-effect */

  const refreshSplits = async () => {
    const result = await getOrderSplits(order.id)

    if (result.ok && result.data) {
      setSplits(result.data)
      return result.data
    }

    toast.error(result.message ?? "No se pudieron leer las partes")
    return null
  }

  const focusSplit = (split: OrderSplit, nextStep: ChargeStep = "review") => {
    setActiveSplitId(split.id)
    // Lo pendiente de confirmar ya no se puede volver a cobrar.
    setAmountInput(
      Math.max(0, split.remainingAmount - split.pendingAmount).toFixed(2)
    )
    setTipInput("")
    setTipPercentValue(null)
    setTipSource("NONE")
    setReviewFilter(split.guestId ?? "all")
    setStep(nextStep)
  }

  const focusFirstPending = (list: OrderSplit[]) => {
    const pending = list.find(
      (split) => split.remainingAmount - split.pendingAmount > 0.004
    )

    if (pending) {
      focusSplit(pending)
      return
    }

    setActiveSplitId(null)
    setStep("close")
  }

  const createSplits = async (
    mode: "BY_GUEST" | "EQUAL",
    parts?: number,
    replace = false
  ): Promise<OrderSplit[] | null> => {
    setSplitBusy(true)

    try {
      const input =
        mode === "EQUAL"
          ? { mode: "EQUAL" as const, parts: parts ?? (Number(equalParts) || 0) }
          : { mode: "BY_GUEST" as const }
      const result = replace
        ? await replaceOrderSplits(order.id, input)
        : await createOrderSplits(order.id, input)

      if (!result.ok || !result.data) {
        toast.error(result.message ?? "No se pudo dividir la cuenta")
        return null
      }

      const created = result.data
      setSplits(created)
      setViewMode(mode)

      if (created.length > 0) {
        focusFirstPending(created)
      }

      toast.success(
        `Cuenta dividida en ${created.length} parte${
          created.length === 1 ? "" : "s"
        }`
      )

      return created
    } finally {
      setSplitBusy(false)
    }
  }

  const selectCombined = () => {
    setViewMode("COMBINED")
    setActiveSplitId(null)
    setReviewFilter("all")
    setAmountInput(null)
    setTipInput("")
    setTipPercentValue(null)
    setTipSource("NONE")
    setStep("review")
  }

  /**
   * Cambia entre división por cliente y partes iguales.
   *
   * Si ya hay partes del otro modo **sin pagos**, se cancelan y se recrean con
   * el nuevo reparto; si ya hay dinero cobrado, se bloquea para no reasignarlo.
   */
  const selectSplitMode = async (mode: "BY_GUEST" | "EQUAL") => {
    if (mode === "BY_GUEST" && reviewGuests.length <= 1) return

    const currentMode =
      splits.find((split) => split.mode !== "CUSTOM")?.mode ??
      splits[0]?.mode ??
      null

    if (splits.length > 0 && currentMode === mode) {
      setViewMode(mode)
      focusFirstPending(splits)
      return
    }

    if (
      splits.some(
        (split) => split.paidAmount > 0 || split.pendingAmount > 0
      )
    ) {
      toast.error(
        "Ya hay pagos en esta división. No se puede cambiar el tipo de reparto."
      )
      return
    }

    if (mode === "EQUAL") {
      setEqualParts(String(defaultParts))
    }

    await createSplits(
      mode,
      mode === "EQUAL" ? defaultParts : undefined,
      splits.length > 0
    )
  }

  const createEqualSplits = async () => {
    await createSplits("EQUAL", Number(equalParts) || defaultParts)
  }

  const resizeEqualSplits = async (delta: number) => {
    const target = Math.min(20, Math.max(2, splits.length + delta))

    if (target === splits.length) return

    if (
      splits.some(
        (split) => split.paidAmount > 0 || split.pendingAmount > 0
      )
    ) {
      toast.error(
        "Ya hay pagos en esta división. No se puede cambiar el número de partes."
      )
      return
    }

    setEqualParts(String(target))
    await createSplits("EQUAL", target, true)
  }

  const activeSplit =
    splits.find((split) => split.id === activeSplitId) ?? null

  /** Partes iguales sugeridas: todos los comensales de la mesa/cuenta. */
  const defaultParts = Math.min(
    20,
    Math.max(2, order.partySize || 2, (order.guests ?? []).length)
  )
  const hasSplitPayments = splits.some(
    (split) => split.paidAmount > 0 || split.pendingAmount > 0
  )

  // Sin edición manual el importe sigue a lo que realmente se puede cobrar
  // (saldo confirmado menos lo pendiente de confirmar).
  const amount = amountInput ?? available.toFixed(2)
  const saleAmount = Math.max(Number(amount) || 0, 0)
  const tip = Math.max(Number(tipInput) || 0, 0)
  const chargeTotal = Math.round((saleAmount + tip) * 100) / 100
  const cashReceived = Math.max(Number(cashInput) || 0, 0)
  const change = Math.round((cashReceived - chargeTotal) * 100) / 100
  const canClose = balance <= 0.004

  const submit = async (
    key: string,
    action: () => Promise<{ ok: boolean; message?: string }>,
    success: string
  ) => {
    setPending(key)

    try {
      const result = await action()

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo completar la operación")
        return false
      }

      toast.success(success)
      setAmountInput(null)
      return true
    } catch {
      toast.error("No se pudo completar la operación")
      return false
    } finally {
      setPending(null)
    }
  }

  /**
   * Refleja un pago confirmado: saldo, parte activa y avance del flujo.
   *
   * Lo usan el cobro en efectivo/tarjeta, la confirmación manual y la terminal.
   */
  const applyConfirmedPayment = (payment: ChargePayment) => {
    setLocalPayments((previous) => [
      ...previous.filter((entry) => entry.id !== payment.id),
      payment,
    ])

    if (!payment.splitId) return

    const sale = Number(payment.amount)

    const nextSplits = splits.map((split) => {
      if (split.id !== payment.splitId) return split

      const remaining = Math.max(
        0,
        Math.round((split.remainingAmount - sale) * 100) / 100
      )

      return {
        ...split,
        paidAmount: Math.round((split.paidAmount + sale) * 100) / 100,
        pendingAmount: Math.max(
          0,
          Math.round((split.pendingAmount - sale) * 100) / 100
        ),
        remainingAmount: remaining,
        status: remaining <= 0.004 ? ("PAID" as const) : split.status,
      }
    })

    setSplits(nextSplits)

    const next = nextSplits.find(
      (split) => split.remainingAmount - split.pendingAmount > 0.004
    )

    if (next) {
      focusSplit(next)
    } else {
      setActiveSplitId(null)
      setStep("close")
    }

    // Reconciliación en segundo plano: la UI ya avanzó.
    void refreshSplits()
  }

  const handleRegister = async (andConfirm: boolean) => {
    const covers = Math.max(balance - saleAmount - tip, 0) <= 0.004
    const ok = await submit(
      "register",
      async () => {
        const value = Number(amount)

        if (!Number.isFinite(value) || value <= 0) {
          return { ok: false, message: "Escribe un importe válido" }
        }

        const created = await registerPayment(order.id, {
          method,
          amount: Math.round(value * 100) / 100,
          tipAmount: Math.round(tip * 100) / 100,
          ...(tip > 0
            ? {
                tipPercent: tipPercentValue,
                tipSource,
                tipBaseAmount: Math.round(saleAmount * 100) / 100,
              }
            : { tipSource: "NONE" as const }),
          ...(activeSplitId ? { splitId: activeSplitId } : {}),
          confirm: andConfirm,
          ...(method === "CASH" && cashInput
            ? { cashReceived: Math.round(cashReceived * 100) / 100 }
            : {}),
          idempotencyKey: crypto.randomUUID(),
        })

        if (!created.ok || !created.data) {
          return { ok: false, message: created.message }
        }

        // Se refleja al instante sin revalidar el POS; al cerrar el diálogo el
        // padre refresca la lista de cuentas.
        setLocalPayments((previous) => [...previous, created.data!])

        return { ok: true }
      },
      andConfirm
        ? "Pago registrado y confirmado"
        : canConfirm
          ? "Pago registrado"
          : "Pago registrado · caja debe confirmarlo"
    )

    if (ok) {
      setTipInput("")
      setTipPercentValue(null)
      setTipSource("NONE")

      // El mesero no puede confirmar: se cierra el diálogo para no dejarlo en
      // un paso que no puede completar. Caja lo confirma después.
      if (!andConfirm && !canConfirm) {
        onClose()
        return
      }

      const wasSplit = activeSplitId

      if (wasSplit && andConfirm) {
        const nextSplits = splits.map((split) => {
          if (split.id !== wasSplit) return split

          const remaining = Math.max(
            0,
            Math.round((split.remainingAmount - saleAmount) * 100) / 100
          )

          return {
            ...split,
            paidAmount:
              Math.round((split.paidAmount + saleAmount) * 100) / 100,
            remainingAmount: remaining,
            status: remaining <= 0.004 ? ("PAID" as const) : split.status,
          }
        })

        setSplits(nextSplits)

        const next = nextSplits.find(
          (split) => split.remainingAmount - split.pendingAmount > 0.004
        )

        if (next) {
          focusSplit(next)
        } else {
          setActiveSplitId(null)
          setStep("close")
        }

        // Reconciliación en segundo plano: la UI ya avanzó.
        void refreshSplits()
        return
      }

      if (wasSplit && !andConfirm) {
        const list = await refreshSplits()
        const current = list?.find((split) => split.id === wasSplit)

        if (current) {
          // Se descuenta lo pendiente: eso es lo que de verdad falta cobrar.
          setAmountInput(
            Math.max(
              0,
              current.remainingAmount - current.pendingAmount
            ).toFixed(2)
          )
        }

        setStep("payment")
        return
      }

      if (andConfirm && covers) {
        setStep("close")
      } else if (!andConfirm) {
        // El pendiente queda en la lista de cobros por confirmar.
        setStep("payment")
      }
    }
  }

  const handleConfirmPayment = async (payment: ChargePayment) => {
    if (payment.method === "MERCADO_PAGO_POINT") {
      toast.info(
        "Los cobros con terminal se confirman solos cuando el cliente paga."
      )
      return
    }

    setPending(`confirm-${payment.id}`)

    try {
      const result = await confirmPayment(payment.id)

      if (!result.ok || !result.data) {
        toast.error(result.message ?? "No se pudo confirmar el pago")
        return
      }

      applyConfirmedPayment(result.data)
      toast.success(`Pago confirmado · ${money(Number(result.data.amount))}`)
    } finally {
      setPending(null)
    }
  }

  const handleVoidPayment = async () => {
    const target = voidTarget

    if (!target) return

    const reason = voidReason.trim()

    if (!reason) {
      toast.error("Indica el motivo de la anulación")
      return
    }

    setPending(`void-${target.id}`)

    try {
      const result = await voidPayment(target.id, reason)

      if (!result.ok || !result.data) {
        toast.error(result.message ?? "No se pudo anular el pago")
        return
      }

      const cancelled = result.data

      setLocalPayments((previous) => [
        ...previous.filter((entry) => entry.id !== cancelled.id),
        cancelled,
      ])

      if (target.splitId) {
        const sale = Number(target.amount)

        // Un pendiente no reducía el saldo de la parte: solo se libera la
        // reserva para poder volver a cobrarla.
        setSplits((current) =>
          current.map((split) =>
            split.id === target.splitId
              ? {
                  ...split,
                  pendingAmount: Math.max(
                    0,
                    Math.round((split.pendingAmount - sale) * 100) / 100
                  ),
                }
              : split
          )
        )
      }

      setVoidTarget(null)
      setVoidReason("")
      toast.success("Pago anulado")
    } finally {
      setPending(null)
    }
  }

  const handleClose = () =>
    submit(
      "close",
      async () => {
        const result = await closeOrder(order.id)

        if (result.ok) {
          onClosed()
        }

        return result
      },
      "Cuenta cerrada"
    )

  const terminalLabel =
    mercadoPago.terminals.find((terminal) => terminal.id === terminalId)
      ?.name ?? "Terminal Point"

  /**
   * Aplica al estado local un cobro confirmado por la terminal.
   *
   * Vive en un ref para que el sondeo use siempre el estado más reciente sin
   * reiniciar el temporizador en cada render.
   */
  const onPointConfirmed = React.useRef<(payment: PointPayment) => void>(
    () => {}
  )

  React.useEffect(() => {
    onPointConfirmed.current = (payment) => {
      const sale = Number(payment.amount)
      const covers = balance - sale <= 0.004

      setPointPayment(null)
      setPointTimedOut(false)
      pointDeadline.current = null
      pointKey.current = null
      toast.success("Pago confirmado en la terminal")

      applyConfirmedPayment(payment)

      if (!payment.splitId) {
        setAmountInput(null)

        if (covers) setStep("close")
      }
    }
  })

  React.useEffect(() => {
    if (!pointPayment || pointPayment.status !== "PENDING") return

    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null

    const tick = async () => {
      if (cancelled) return

      if (
        pointDeadline.current !== null &&
        Date.now() > pointDeadline.current
      ) {
        setPointTimedOut(true)
        cancelled = true
        if (timer) clearInterval(timer)
        return
      }

      const result = await syncPointPayment(pointPayment.id)
      if (cancelled || !result.ok || !result.data) return

      const next = result.data

      if (next.status === "CONFIRMED") {
        cancelled = true
        if (timer) clearInterval(timer)
        onPointConfirmed.current(next)
        return
      }

      // Se evita cambiar la identidad del pago si MP no dijo nada nuevo: así
      // el intervalo no se reinicia en cada sondeo.
      setPointPayment((previous) =>
        previous &&
        previous.status === next.status &&
        previous.providerStatus === next.providerStatus &&
        previous.providerStatusDetail === next.providerStatusDetail
          ? previous
          : next
      )

      if (next.status !== "PENDING") {
        toast.error(
          PROVIDER_DETAIL_LABELS[next.providerStatusDetail ?? ""] ??
            next.providerStatusDetail ??
            "El cobro no se completó"
        )
      }
    }

    timer = setInterval(() => void tick(), 2500)

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [pointPayment])

  const handleSyncNow = async () => {
    if (!pointPayment) return

    setPending("sync")

    try {
      const result = await syncPointPayment(pointPayment.id)

      if (!result.ok || !result.data) {
        toast.error(result.message ?? "No se pudo sincronizar el cobro")
        return
      }

      const next = result.data

      if (next.status === "CONFIRMED") {
        onPointConfirmed.current(next)
        return
      }

      setPointPayment(next)

      if (next.status !== "PENDING") {
        toast.error(
          PROVIDER_DETAIL_LABELS[next.providerStatusDetail ?? ""] ??
            next.providerStatusDetail ??
            "El cobro no se completó"
        )
      } else {
        toast.info("Todavía no hay pago en la terminal")
      }
    } finally {
      setPending(null)
    }
  }

  const resetPointCharge = () => {
    setPointPayment(null)
    setPointTimedOut(false)
    // Al reintentar se vuelve al saldo de la parte activa, no al total.
    const split = splits.find((entry) => entry.id === activeSplitId)
    setAmountInput(split ? split.remainingAmount.toFixed(2) : null)
    pointDeadline.current = null
    pointKey.current = null
  }

  const handleCancelPoint = async () => {
    if (!pointPayment) return

    setPending("cancel-point")

    try {
      const result = await cancelPointCharge(pointPayment.id)

      if (!result.ok || !result.data) {
        toast.error(result.message ?? "No se pudo cancelar el cobro")
        return
      }

      setPointPayment(result.data)

      if (result.data.status === "CANCELLED") {
        toast.success("Cobro cancelado")
        resetPointCharge()
      } else {
        toast.info("Cancelación solicitada. Confirma en la terminal.")
      }
    } finally {
      setPending(null)
    }
  }

  const handleSendToPoint = async () => {
    if (!Number.isFinite(saleAmount) || saleAmount <= 0) {
      toast.error("Escribe un importe válido")
      return
    }

    const terminal = terminalId || mercadoPago.terminals[0]?.id

    if (!terminal) {
      toast.error("Configura una terminal en Configuración → Pagos")
      return
    }

    setPending("point")
    setPointTimedOut(false)

    // El mismo intento reutiliza la clave: si la red falla, el reintento no
    // crea una segunda orden en la terminal.
    const idempotencyKey =
      pointKey.current ?? (pointKey.current = crypto.randomUUID())

    try {
      const result = await chargeWithPoint(order.id, {
        amount: Math.round(saleAmount * 100) / 100,
        tipAmount: Math.round(tip * 100) / 100,
        tipPercent: tip > 0 ? tipPercentValue : null,
        tipSource: tip > 0 ? tipSource : "NONE",
        tipBaseAmount: tip > 0 ? Math.round(saleAmount * 100) / 100 : null,
        ...(activeSplitId ? { splitId: activeSplitId } : {}),
        terminalId: terminal,
        idempotencyKey,
      })

      if (!result.ok || !result.data) {
        // Un fallo de envío no deja cobro vivo: el siguiente intento usa una
        // clave nueva para no chocar con un pago ya cancelado.
        pointKey.current = null
        toast.error(result.message ?? "No se pudo enviar el cobro")
        return
      }

      pointDeadline.current = Date.now() + 3 * 60 * 1000
      setPointPayment(result.data)
      setStep("payment")
      toast.success("Cobro enviado a la terminal")
    } finally {
      setPending(null)
    }
  }

  const chooseMethod = (value: PaymentMethod) => {
    if (pointPending) {
      toast.info("Cancela el cobro en la terminal antes de cambiar de método.")
      return
    }

    setMethod(value)
  }

  const stepIndex = STEPS.findIndex((entry) => entry.id === step)
  const canEnterStep = (id: ChargeStep) => {
    if (pointPending) return id === step
    if (id === "close") return canClose

    return true
  }

  const goBack = () => {
    if (pointPending) {
      toast.info("Cancela el cobro en la terminal antes de continuar.")
      return
    }

    if (step === "review") {
      onClose()
      return
    }

    if (step === "payment") {
      setStep("review")
      return
    }

    const index = STEPS.findIndex((entry) => entry.id === step)
    setStep(STEPS[Math.max(0, index - 1)].id)
  }

  const detailRounds = React.useMemo(
    () => detail?.rounds ?? [],
    [detail]
  )
  const reviewGuests = detail?.guests ?? order.guests ?? []
  const reviewItems = React.useMemo(
    () => detailRounds.flatMap((round) => round.items),
    [detailRounds]
  )
  const filteredReviewItems = React.useMemo(
    () =>
      reviewItems.filter((item) => {
        if (reviewFilter === "all") return true
        if (reviewFilter === "__general__") return !item.guestId

        return item.guestId === reviewFilter
      }),
    [reviewItems, reviewFilter]
  )
  const reviewQuantity = React.useMemo(
    () => filteredReviewItems.reduce((sum, item) => sum + item.quantity, 0),
    [filteredReviewItems]
  )
  const reviewTotal = React.useMemo(
    () =>
      filteredReviewItems.reduce(
        (sum, item) => sum + Number(item.subtotal),
        0
      ),
    [filteredReviewItems]
  )

  // «Todo» muestra el resumen de todos los platillos, agrupados por nombre.
  const reviewSummary = React.useMemo(() => {
    const grouped = new Map<
      string,
      {
        name: string
        variant: string | null
        quantity: number
        total: number
      }
    >()

    for (const item of filteredReviewItems) {
      const key = `${item.itemName}::${item.variantName ?? ""}`
      const current = grouped.get(key)

      if (current) {
        current.quantity += item.quantity
        current.total += Number(item.subtotal)
      } else {
        grouped.set(key, {
          name: item.itemName,
          variant: item.variantName,
          quantity: item.quantity,
          total: Number(item.subtotal),
        })
      }
    }

    return [...grouped.values()]
  }, [filteredReviewItems])

  const splitStep = step === "payment" ? 2 : step === "tip" ? 3 : step === "close" ? 3 : 1
  const splitStepLabel =
    splitStep === 1 ? "Resumen" : splitStep === 2 ? "Pago" : "Propina"

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (open) return

          if (pointPending) {
            toast.info("Cancela el cobro en la terminal antes de salir.")
            return
          }

          onClose()
        }}
      >
        <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cobrar · {orderLabel(order)}</DialogTitle>
          <DialogDescription>
            {step === "review"
              ? "Revisa los artículos antes de cobrar."
              : step === "payment"
                ? "Elige el método y el importe."
                : step === "tip"
                  ? "Agrega propina si el cliente la deja."
                  : "Confirma el pago y cierra la cuenta."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <div
            className={cn(
              "grid gap-2",
              reviewGuests.length > 1 ? "grid-cols-3" : "grid-cols-2"
            )}
          >
            <Button
              type="button"
              variant="outline"
              className={cn(
                "border",
                viewMode === "COMBINED"
                  ? "border-chart-2/60 bg-chart-2/10 text-chart-2 hover:bg-chart-2/20 hover:text-chart-2"
                  : "border-muted-foreground/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
              onClick={selectCombined}
              disabled={pointPending}
            >
              Cuenta completa
            </Button>
            {reviewGuests.length > 1 ? (
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "border",
                  viewMode === "BY_GUEST"
                    ? "border-chart-2/60 bg-chart-2/10 text-chart-2 hover:bg-chart-2/20 hover:text-chart-2"
                    : "border-muted-foreground/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
                onClick={() => void selectSplitMode("BY_GUEST")}
                disabled={splitBusy || pointPending}
              >
                Por cliente
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className={cn(
                "border",
                viewMode === "EQUAL"
                  ? "border-chart-2/60 bg-chart-2/10 text-chart-2 hover:bg-chart-2/20 hover:text-chart-2"
                  : "border-muted-foreground/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
              onClick={() => void selectSplitMode("EQUAL")}
              disabled={splitBusy || pointPending}
            >
              Partes iguales
            </Button>
          </div>

          {viewMode === "EQUAL" && splits.length === 0 ? (
            <div className="flex items-end gap-2">
              <div className="flex w-28 flex-col gap-1">
                <Label htmlFor="split-parts">Partes</Label>
                <Input
                  id="split-parts"
                  type="number"
                  min="2"
                  max="20"
                  value={equalParts}
                  onChange={(event) => setEqualParts(event.target.value)}
                />
              </div>
              <Button
                type="button"
                onClick={() => void createEqualSplits()}
                disabled={splitBusy}
              >
                {splitBusy ? <Loader2Icon className="animate-spin" /> : null}
                Crear partes
              </Button>
            </div>
          ) : null}

          {viewMode === "EQUAL" && splits.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Número de partes
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Quitar una parte"
                onClick={() => void resizeEqualSplits(-1)}
                disabled={splitBusy || splits.length <= 2 || hasSplitPayments}
              >
                −
              </Button>
              <span className="w-6 text-center text-sm font-medium tabular-nums">
                {splits.length}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Agregar una parte"
                onClick={() => void resizeEqualSplits(1)}
                disabled={splitBusy || splits.length >= 20 || hasSplitPayments}
              >
                +
              </Button>
              {hasSplitPayments ? (
                <span className="text-[11px] text-muted-foreground">
                  Hay pagos: cancela la división para cambiar el número.
                </span>
              ) : null}
            </div>
          ) : null}

          {viewMode !== "COMBINED" && splits.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {splits.map((split) => (
                <Button
                  key={split.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={jalapenoChipClass(split.id === activeSplitId)}
                  aria-pressed={split.id === activeSplitId}
                  onClick={() => focusSplit(split)}
                >
                  {split.status === "PAID" ? (
                    <CheckIcon className="size-3.5" />
                  ) : null}
                  {split.label ?? "Parte"}
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        {viewMode === "COMBINED" ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-1">
              {STEPS.map((entry, index) => {
                const Icon = STEP_ICONS[entry.id]
                const active = entry.id === step
                const done = index < stepIndex
                const disabled = !canEnterStep(entry.id)

                return (
                  <button
                    key={entry.id}
                    type="button"
                    disabled={disabled}
                    aria-current={active ? "step" : undefined}
                    onClick={() => setStep(entry.id)}
                    className={cn(
                      "flex flex-1 flex-col items-center gap-1 rounded-md px-1 py-1 text-[11px] transition-colors",
                      active
                        ? "font-medium text-primary"
                        : done
                          ? "text-primary/80"
                          : "text-muted-foreground",
                      disabled && "opacity-40"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full border transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : done
                            ? "border-primary/50 bg-primary/10 text-primary"
                            : "border-border"
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    {entry.label}
                  </button>
                )
              })}
            </div>

            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Progreso del cobro"
              aria-valuemin={1}
              aria-valuemax={STEPS.length}
              aria-valuenow={stepIndex + 1}
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{
                  width: `${((stepIndex + 1) / STEPS.length) * 100}%`,
                }}
              />
            </div>
          </div>
        ) : activeSplit ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {activeSplit.label ?? "Parte"} · {splitStepLabel} ({splitStep} de
                3)
              </span>
              <span className="tabular-nums">
                {activeSplit.remainingAmount > 0
                  ? `${money(activeSplit.remainingAmount)} restantes`
                  : "Pagada"}
              </span>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Progreso de la parte"
              aria-valuemin={1}
              aria-valuemax={3}
              aria-valuenow={splitStep}
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${(splitStep / 3) * 100}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-4">
          {pendingTotal > 0 && step !== "payment" ? (
            <button
              type="button"
              onClick={() => setStep("payment")}
              className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-left text-sm text-amber-700 transition-colors hover:bg-amber-500/15 dark:text-amber-300"
            >
              <CircleAlertIcon className="size-4 shrink-0" />
              <span>
                Cobros por confirmar: <strong>{money(pendingTotal)}</strong>
              </span>
              <span className="ml-auto text-xs underline">Revisar</span>
            </button>
          ) : null}

          {step === "review" ? (
            detailLoading ? (
              <p className="flex items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                Cargando artículos…
              </p>
            ) : detailError ? (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                No se pudieron cargar los artículos. Revisa el total antes de
                cobrar.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {viewMode !== "COMBINED" && activeSplit ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {activeSplit.label ?? "Parte"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {money(activeSplit.paidAmount)} de{" "}
                        {money(activeSplit.expectedAmount)}
                        {activeSplit.remainingAmount > 0
                          ? ` · faltan ${money(activeSplit.remainingAmount)}`
                          : " · pagada"}
                      </p>
                    </div>
                    <Badge
                      variant={
                        activeSplit.status === "PAID" ? "secondary" : "outline"
                      }
                    >
                      {activeSplit.status === "PAID"
                        ? "Pagada"
                        : activeSplit.remainingAmount <= 0 &&
                            activeSplit.pendingAmount > 0
                          ? "Por confirmar"
                          : "Pendiente"}
                    </Badge>
                  </div>
                ) : null}

                {viewMode !== "COMBINED" && !activeSplit ? (
                  <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    Elige una parte o crea la división para empezar.
                  </p>
                ) : viewMode === "EQUAL" ||
                (viewMode === "BY_GUEST" && activeSplit?.guestId === null) ? (
                  <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    {viewMode === "EQUAL"
                      ? "Parte igual de la cuenta. No se desglosan artículos por persona."
                      : "Parte adicional de la cuenta. No se desglosan artículos por persona."}
                  </p>
                ) : reviewSummary.length > 0 ? (
                  <>
                    {viewMode === "BY_GUEST" && activeSplit ? (
                      <p className="text-xs text-muted-foreground">
                        Incluye su parte de artículos generales y envío.
                      </p>
                    ) : null}
                    <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto pr-1">
                      {reviewSummary.map((line) => (
                        <li
                          key={`${line.name}::${line.variant ?? ""}`}
                          className="flex items-baseline gap-2 text-sm"
                        >
                          <span className="min-w-0">
                            <span className="font-medium tabular-nums">
                              {line.quantity}×
                            </span>{" "}
                            {line.name}
                            {line.variant ? (
                              <span className="text-muted-foreground">
                                {" "}
                                · {line.variant}
                              </span>
                            ) : null}
                          </span>
                          <span
                            aria-hidden="true"
                            className="mx-1 min-w-4 flex-1 border-b-2 border-dotted border-muted-foreground/50"
                          />
                          <span className="shrink-0 tabular-nums">
                            {money(line.total)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Separator />
                    <p className="text-right text-sm tabular-nums">
                      {reviewQuantity} artículo
                      {reviewQuantity === 1 ? "" : "s"} ·{" "}
                      {money(reviewTotal)}
                    </p>
                  </>
                ) : (
                  <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    {reviewItems.length === 0
                      ? "La cuenta no tiene artículos."
                      : "No hay artículos para este filtro."}
                  </p>
                )}
              </div>
            )
          ) : null}


          {step === "payment" ? (
            <>
          {activeSplit ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
              <span>
                Cobrando <strong>{activeSplit.label ?? "parte"}</strong>
              </span>
              <span className="text-muted-foreground tabular-nums">
                {activeSplit.remainingAmount - activeSplit.pendingAmount > 0.004
                  ? `Faltan ${money(
                      activeSplit.remainingAmount - activeSplit.pendingAmount
                    )}`
                  : activeSplit.pendingAmount > 0
                    ? `Por confirmar ${money(activeSplit.pendingAmount)}`
                    : "Pagada"}
              </span>
            </div>
          ) : null}
          {pendingPayments.length > 0 ? (
            <div className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <CircleAlertIcon className="size-4 text-amber-600 dark:text-amber-400" />
                  Cobros por confirmar
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {money(pendingTotal)}
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {pendingPayments.map((payment) => {
                  const part = payment.splitId
                    ? (splits.find((split) => split.id === payment.splitId)
                        ?.label ?? null)
                    : null
                  const tipAmount = Number(payment.tipAmount ?? 0)
                  const isPoint = payment.method === "MERCADO_PAGO_POINT"

                  return (
                    <li
                      key={payment.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="font-medium">
                          {PAYMENT_METHOD_LABELS[payment.method]}
                        </span>
                        {part ? (
                          <span className="text-muted-foreground"> · {part}</span>
                        ) : null}
                        {tipAmount > 0 ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · propina {money(tipAmount)}
                          </span>
                        ) : null}
                        {payment.createdAt ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · {paymentTime(payment.createdAt)}
                          </span>
                        ) : null}
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="tabular-nums">
                          {money(Number(payment.amount))}
                        </span>
                        {isPoint ? (
                          <Badge variant="outline">En terminal</Badge>
                        ) : (
                          <>
                            {canConfirm ? (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => void handleConfirmPayment(payment)}
                                disabled={pending !== null}
                              >
                                {pending === `confirm-${payment.id}` ? (
                                  <Loader2Icon className="animate-spin" />
                                ) : null}
                                Confirmar
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setVoidTarget(payment)
                                setVoidReason("")
                              }}
                              disabled={pending !== null}
                            >
                              Anular
                            </Button>
                          </>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
              {!canConfirm ? (
                <p className="text-xs text-muted-foreground">
                  Caja o administración debe confirmarlos.
                </p>
              ) : null}
            </div>
          ) : null}
          {pointPayment ? (
            <div className="flex flex-col gap-3 rounded-lg border p-4">
              {pointPayment.status === "PENDING" ? (
                <>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Loader2Icon className="size-4 animate-spin" />
                    Esperando el pago en la terminal…
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {money(pointTotal)} · {terminalLabel}
                    {Number(pointPayment.tipAmount ?? 0) > 0
                      ? ` · incluye ${money(Number(pointPayment.tipAmount))} de propina`
                      : ""}
                  </p>
                  {pointPayment.providerStatus === "action_required" ? (
                    <p className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                      <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
                      La terminal pide confirmación. Revisa el dispositivo y
                      vuelve a sincronizar.
                    </p>
                  ) : null}
                  {pointTimedOut ? (
                    <p className="text-xs text-muted-foreground">
                      Han pasado más de 3 minutos. Revisa la terminal y pulsa
                      “Sincronizar ahora”.
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSyncNow}
                      disabled={pending !== null}
                    >
                      <RefreshCwIcon data-icon="inline-start" />
                      Sincronizar ahora
                    </Button>
                    {canConfirm ? (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleCancelPoint}
                        disabled={pending !== null}
                      >
                        <Undo2Icon data-icon="inline-start" />
                        Cancelar cobro
                      </Button>
                    ) : null}
                    {pointTimedOut ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        disabled={pending !== null}
                      >
                        Salir y conciliar después
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {pointPayment.status === "CONFIRMED" ? (
                      <CheckCircle2Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <CircleAlertIcon className="size-4 text-destructive" />
                    )}
                    {pointPayment.status === "CONFIRMED"
                      ? "Pago confirmado en la terminal"
                      : "Cobro no completado"}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {money(pointTotal)} ·{" "}
                    {PROVIDER_DETAIL_LABELS[
                      pointPayment.providerStatusDetail ?? ""
                    ] ??
                      pointPayment.providerStatusDetail ??
                      (pointPayment.status === "CONFIRMED"
                        ? "El pago ya cubre parte del saldo."
                        : "Puedes intentarlo de nuevo.")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" onClick={resetPointCharge}>
                      Nuevo cobro
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : !canClose ? (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-2">
                {methods.map((value) => {
                  const Icon = METHOD_ICONS[value]
                  const active = method === value

                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => chooseMethod(value)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors",
                        active
                          ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                          : "bg-card hover:bg-muted/50"
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-4",
                          active ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      <span className="font-medium">
                        {PAYMENT_METHOD_LABELS[value]}
                      </span>
                    </button>
                  )
                })}
              </div>

              {method === "CASH" ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="payment-amount">Importe</Label>
                    <Input
                      id="payment-amount"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      value={amount}
                      onChange={(event) => setAmountInput(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="payment-cash">Efectivo recibido</Label>
                    <Input
                      id="payment-cash"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      value={cashInput}
                      onChange={(event) => setCashInput(event.target.value)}
                      placeholder="Opcional"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Cambio</Label>
                    <div className="flex h-9 items-center rounded-md border border-input px-3 text-sm tabular-nums">
                      {cashInput
                        ? change >= 0
                          ? money(change)
                          : "Falta efectivo"
                        : "—"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="payment-amount">Importe</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={amount}
                    onChange={(event) => setAmountInput(event.target.value)}
                  />
                </div>
              )}

              {method === "MERCADO_PAGO_POINT" ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="point-terminal">Terminal</Label>
                  <Select
                    value={terminalId}
                    onValueChange={(value) => setTerminalId(value ?? "")}
                    items={mercadoPago.terminals.map((terminal) => ({
                      value: terminal.id,
                      label: terminal.name ?? "Terminal Point",
                    }))}
                  >
                    <SelectTrigger
                      id="point-terminal"
                      className="w-full"
                      aria-label="Terminal Point"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mercadoPago.terminals.map((terminal) => (
                        <SelectItem key={terminal.id} value={terminal.id}>
                          {terminal.name ?? "Terminal Point"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    El cobro se envía a la terminal y se confirma solo cuando el
                    cliente paga.
                  </p>
                </div>
              ) : null}

              {method !== "MERCADO_PAGO_POINT" && !canConfirm ? (
                <p className="text-xs text-muted-foreground">
                  Tu rol puede registrar pagos; caja o administración los
                  confirma.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              La cuenta está cubierta. Puedes cerrarla.
            </p>
          )}

            </>
          ) : null}

          {step === "tip" ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-4 gap-2">
                {[0, 10, 15, 20].map((percent) => {
                  const suggested =
                    percent === 0
                      ? 0
                      : Math.round(saleAmount * percent) / 100
                  const active =
                    percent === 0
                      ? tip === 0
                      : Math.abs(tip - suggested) < 0.005

                  return (
                    <button
                      key={percent}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setTipInput(
                          percent === 0 ? "" : suggested.toFixed(2)
                        )
                        setTipPercentValue(percent === 0 ? null : percent)
                        setTipSource(percent === 0 ? "NONE" : "SUGGESTED")
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center gap-0.5 rounded-lg border p-3 text-center text-sm transition-colors",
                        active
                          ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                          : "bg-card hover:bg-muted/50"
                      )}
                    >
                      <span className="font-medium">
                        {percent === 0 ? "Sin propina" : `${percent}%`}
                      </span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {money(suggested)}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="payment-tip">Propina</Label>
                <Input
                  id="payment-tip"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={tipInput}
                  onChange={(event) => {
                    setTipInput(event.target.value)
                    setTipPercentValue(null)
                    setTipSource(
                      event.target.value.trim() === "" ? "NONE" : "CUSTOM"
                    )
                  }}
                  placeholder="0.00"
                />
              </div>
              {displayTipPercent && displayTipPercent > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Propina elegida por el cliente en la pantalla (
                  {displayTipPercent}%).
                </p>
              ) : null}
              {method === "MERCADO_PAGO_POINT" ? (
                <p className="text-xs text-muted-foreground">
                  La terminal cobra el importe más la propina en una sola
                  operación.
                </p>
              ) : !canConfirm ? (
                <p className="text-xs text-muted-foreground">
                  Tu rol puede registrar pagos; caja o administración los
                  confirma.
                </p>
              ) : null}
            </div>
          ) : null}

          {step === "close" ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                {canClose
                  ? "La cuenta está cubierta y lista para cerrarse."
                  : pendingTotal > 0 && available <= 0.004
                    ? `Falta confirmar ${money(pendingTotal)} para cerrar la cuenta.`
                    : `Falta cobrar ${money(available)}${
                        pendingTotal > 0
                          ? ` y confirmar ${money(pendingTotal)}`
                          : ""
                      }.`}
              </p>
              {viewMode !== "COMBINED" && splits.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Partes pagadas:{" "}
                  {splits.filter((split) => split.remainingAmount <= 0).length}{" "}
                  de {splits.length}.
                </p>
              ) : null}
              {pendingPayments.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {pendingPayments.length} cobro(s) pendiente(s) de confirmación.
                </p>
              ) : null}
              {!canConfirm ? (
                <p className="text-xs text-muted-foreground">
                  Solo caja o administración puede cerrar la cuenta.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={step === "review" ? onClose : goBack}
            disabled={pointPending}
          >
            {step === "review" ? "Volver" : "Atrás"}
          </Button>

          <div className="flex flex-wrap justify-end gap-2">
            {step === "review" ? (
              <Button
                type="button"
                onClick={() => setStep(canClose ? "close" : "payment")}
                disabled={
                  (viewMode !== "COMBINED" && !activeSplit && !canClose) ||
                  (viewMode !== "COMBINED" &&
                    activeSplit !== null &&
                    activeSplit.remainingAmount <= 0)
                }
              >
                {viewMode !== "COMBINED" &&
                activeSplit &&
                activeSplit.remainingAmount <= 0
                  ? "Parte pagada"
                  : canClose
                    ? "Ver cierre"
                    : "Continuar"}
              </Button>
            ) : null}

            {step === "payment" ? (
              <Button
                type="button"
                onClick={() => setStep("tip")}
                disabled={pending !== null || pointPending}
              >
                Continuar
              </Button>
            ) : null}

            {step === "tip" ? (
              method === "MERCADO_PAGO_POINT" ? (
                <Button
                  type="button"
                  onClick={() => void handleSendToPoint()}
                  disabled={pending !== null || !terminalId || saleAmount <= 0}
                >
                  {pending === "point" ? (
                    <Loader2Icon className="animate-spin" />
                  ) : null}
                  Cobrar en terminal
                </Button>
              ) : canConfirm ? (
                <>
                  <Button
                    type="button"
                    onClick={() => void handleRegister(true)}
                    disabled={pending !== null || saleAmount <= 0}
                  >
                    {pending === "register" ? (
                      <Loader2Icon className="animate-spin" />
                    ) : null}
                    Cobrar y confirmar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleRegister(false)}
                    disabled={pending !== null || saleAmount <= 0}
                  >
                    Solo registrar
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={() => void handleRegister(false)}
                  disabled={pending !== null || saleAmount <= 0}
                >
                  {pending === "register" ? (
                    <Loader2Icon className="animate-spin" />
                  ) : null}
                  Registrar pago
                </Button>
              )
            ) : null}

            {step === "close" && canConfirm ? (
              canClose ? (
                <Button
                  type="button"
                  onClick={handleClose}
                  disabled={pending !== null}
                >
                  {pending === "close" ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <LockIcon />
                  )}
                  Cerrar cuenta
                </Button>
              ) : (
                <Button type="button" onClick={() => setStep("payment")}>
                  Cobrar saldo
                </Button>
              )
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
      </Dialog>

      <AlertDialog
        open={voidTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setVoidTarget(null)
            setVoidReason("")
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Undo2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>Anular cobro pendiente</AlertDialogTitle>
            <AlertDialogDescription>
              {voidTarget
                ? `${PAYMENT_METHOD_LABELS[voidTarget.method]} · ${money(
                    Number(voidTarget.amount)
                  )}. Deja de reservar saldo de la cuenta.`
                : "El cobro dejará de reservar saldo de la cuenta."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="void-reason">Motivo</Label>
            <Input
              id="void-reason"
              value={voidReason}
              maxLength={200}
              placeholder="Error de captura"
              onChange={(event) => setVoidReason(event.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending !== null}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending !== null || !voidReason.trim()}
              onClick={() => void handleVoidPayment()}
            >
              Anular cobro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

