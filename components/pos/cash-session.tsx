"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  ChevronDownIcon,
  CreditCardIcon,
  Loader2Icon,
  LockIcon,
  ReceiptTextIcon,
} from "lucide-react"
import { toast } from "sonner"

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Textarea } from "@/components/ui/textarea"
import { useOfflineSync } from "@/components/offline/offline-provider"
import { useMoney } from "@/lib/currency"
import {
  addCashMovement,
  closeCashSession,
  getCashReconciliation,
  openCashSession,
} from "@/lib/cash-actions"
import { reconcilePayment } from "@/lib/payment-actions"
import {
  CASH_MOVEMENT_LABELS,
  type CashMovementType,
  type CashReconciliation,
  type CashSession,
  type CashSummary,
  type PendingReviewPayment,
} from "@/lib/cash"

const MOVEMENT_TYPES: CashMovementType[] = [
  "WITHDRAWAL",
  "DEPOSIT",
  "EXPENSE",
]

/**
 * Acciones de caja para la barra del POS: apertura, cierre ciego y movimientos.
 *
 * La caja se maneja por sucursal: si no hay una abierta, el POS bloquea los
 * cobros hasta que caja o administración la abran.
 */
export function CashSessionActions({
  session,
  summary,
  canManage,
}: {
  session: CashSession | null
  summary: CashSummary | null
  canManage: boolean
}) {
  const router = useRouter()
  const offline = useOfflineSync()
  const [openOpen, setOpenOpen] = React.useState(false)
  const [openClose, setOpenClose] = React.useState(false)
  const [openMovement, setOpenMovement] = React.useState(false)
  const closePending = session
    ? offline.hasPendingCashClose(session.id)
    : false

  if (!canManage) return null

  return (
    <>
      {session ? (
        <ButtonGroup>
          <Button
            type="button"
            variant="outline"
            disabled={closePending}
            onClick={() => setOpenClose(true)}
          >
            <LockIcon data-icon="inline-start" />
            {closePending ? "Cierre pendiente" : "Cerrar caja"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Más acciones de caja"
                />
              }
            >
              <ChevronDownIcon />
              <span className="sr-only">Más acciones de caja</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setOpenMovement(true)}>
                <ArrowDownToLineIcon />
                Movimiento
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ButtonGroup>
      ) : (
        <Button type="button" onClick={() => setOpenOpen(true)}>
          <ReceiptTextIcon data-icon="inline-start" />
          Abrir caja
        </Button>
      )}

      <OpenDialog
        open={openOpen}
        onOpenChange={setOpenOpen}
        onDone={() => router.refresh()}
      />
      {session ? (
        <CloseDialog
          open={openClose}
          onOpenChange={setOpenClose}
          session={session}
          summary={summary}
          onDone={() => {
            if (offline.isOnline) router.refresh()
          }}
        />
      ) : null}
      {session ? (
        <MovementDialog
          open={openMovement}
          onOpenChange={setOpenMovement}
          session={session}
          onDone={() => router.refresh()}
        />
      ) : null}
    </>
  )
}

function OpenDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}) {
  const [openingFloat, setOpeningFloat] = React.useState("0")
  const [pending, setPending] = React.useState(false)

  const submit = async () => {
    const value = Number(openingFloat)

    if (!Number.isFinite(value) || value < 0) {
      toast.error("Escribe un fondo inicial válido")
      return
    }

    setPending(true)

    try {
      const result = await openCashSession(Math.round(value * 100) / 100)

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo abrir la caja")
        return
      }

      toast.success("Caja abierta")
      setOpeningFloat("0")
      onOpenChange(false)
      onDone()
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Abrir caja</DialogTitle>
          <DialogDescription>
            Registra el fondo inicial con el que empieza el turno.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="opening-float">Fondo inicial</Label>
          <Input
            id="opening-float"
            type="number"
            inputMode="decimal"
            min="0"
            value={openingFloat}
            onChange={(event) => setOpeningFloat(event.target.value)}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            Abrir caja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CloseDialog({
  open,
  onOpenChange,
  session,
  summary,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: CashSession
  summary: CashSummary | null
  onDone: () => void
}) {
  const money = useMoney()
  const router = useRouter()
  const offline = useOfflineSync()
  const [countedCash, setCountedCash] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const [showReconciliation, setShowReconciliation] = React.useState(false)
  const [reconciliation, setReconciliation] =
    React.useState<CashReconciliation | null>(null)
  const [loadingReconciliation, setLoadingReconciliation] =
    React.useState(false)
  const [reconciliationVersion, setReconciliationVersion] =
    React.useState(0)
  const [reconcilePending, setReconcilePending] =
    React.useState<PendingReviewPayment | null>(null)
  const [reconcileMode, setReconcileMode] =
    React.useState<"CONFIRM" | "REJECT">("CONFIRM")
  const [reconcileReason, setReconcileReason] = React.useState("")
  const [reconciling, setReconciling] = React.useState(false)

  // Conciliación en vivo: se pide al servidor para que el desglose y las
  // alertas sean los mismos que se guardan al cerrar, no una copia en cliente.
  React.useEffect(() => {
    if (!showReconciliation) return

    const counted = Number(countedCash)
    const value = countedCash.trim() ? counted : undefined

    let cancelled = false

    const timer = setTimeout(async () => {
      setLoadingReconciliation(true)
      const result = await getCashReconciliation(session.id, value)
      if (cancelled) return
      setReconciliation(result.ok ? (result.data ?? null) : null)
      setLoadingReconciliation(false)
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [showReconciliation, countedCash, session.id, reconciliationVersion])

  // Conteo ciego: no se muestra el esperado antes de cerrar.
  const submit = async () => {
    const value = Number(countedCash)

    if (!Number.isFinite(value) || value < 0) {
      toast.error("Escribe el efectivo contado")
      return
    }

    setPending(true)

    try {
      const rounded = Math.round(value * 100) / 100

      if (!offline.isOnline) {
        await offline.enqueueCashClose({
          sessionId: session.id,
          countedCash: rounded,
          notes: notes.trim() || undefined,
          label: "Cierre de caja",
        })

        toast.success("Cierre guardado en este dispositivo", {
          description:
            "Se enviará al reconectar. No se podrá cobrar hasta confirmar el cierre.",
        })

        setCountedCash("")
        setNotes("")
        onOpenChange(false)
        onDone()
        return
      }

      const result = await closeCashSession(session.id, {
        countedCash: rounded,
        notes: notes.trim() || undefined,
        idempotencyKey: crypto.randomUUID(),
      })

      if (!result.ok || !result.data) {
        toast.error(result.message ?? "No se pudo cerrar la caja")
        return
      }

      const closed = result.data.session

      if (!closed) {
        toast.error("No se pudo leer la caja cerrada")
        return
      }

      const difference = Number(closed.difference ?? 0)
      const expected = Number(closed.expectedCash ?? 0)

      toast.success(
        difference === 0
          ? "Caja cerrada sin diferencias"
          : `Caja cerrada · ${difference > 0 ? "sobrante" : "faltante"} de ${money(Math.abs(difference))}`,
        {
          description: `Esperado ${money(expected)} · contado ${money(closed.countedCash ?? 0)}`,
        }
      )

      setCountedCash("")
      setNotes("")
      onOpenChange(false)
      onDone()
    } finally {
      setPending(false)
    }
  }

  const resolvePending = async () => {
    if (!reconcilePending) return

    if (reconcileMode === "REJECT" && reconcileReason.trim().length < 3) {
      toast.error("Indica el motivo del rechazo")
      return
    }

    setReconciling(true)

    try {
      const result = await reconcilePayment(reconcilePending.id, {
        resolution: reconcileMode,
        reason:
          reconcileMode === "REJECT" ? reconcileReason.trim() : undefined,
        closeOrder: reconcileMode === "CONFIRM",
      })

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo conciliar el cobro")
        return
      }

      if (reconcileMode === "CONFIRM") {
        toast.success("Cobro confirmado")
        if (result.data?.closeMessage) {
          toast.info("La cuenta no se cerró", {
            description: result.data.closeMessage,
          })
        }
      } else {
        toast.success("Cobro rechazado", {
          description: "El pago quedó anulado.",
        })
      }

      setReconcilePending(null)
      setReconcileReason("")
      setReconciliationVersion((value) => value + 1)
      router.refresh()
    } finally {
      setReconciling(false)
    }
  }

  const pendingReviewCount = reconciliation?.pending.count ?? 0

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cerrar caja</DialogTitle>
          <DialogDescription>
            Cuenta el efectivo del cajón sin ver el esperado. La diferencia se
            muestra al cerrar y queda auditada.
            {!offline.isOnline
              ? " Sin conexión, el cierre se guarda en el dispositivo y se envía al reconectar."
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            Fondo inicial {money(session.openingFloat)}
            {summary ? (
              <>
                {" · "}Ventas en efectivo {money(summary.cash.sales)}
                {summary.cash.withdrawals > 0
                  ? ` · Retiros ${money(summary.cash.withdrawals)}`
                  : ""}
              </>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="counted-cash">Efectivo contado</Label>
            <Input
              id="counted-cash"
              type="number"
              inputMode="decimal"
              min="0"
              value={countedCash}
              onChange={(event) => setCountedCash(event.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="flex flex-col gap-2">
            {offline.isOnline ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={() => setShowReconciliation((value) => !value)}
                >
                  {showReconciliation ? "Ocultar conciliación" : "Ver conciliación"}
                </Button>

                {showReconciliation ? (
              <div className="flex flex-col gap-3 rounded-lg border p-3 text-sm">
                {loadingReconciliation && !reconciliation ? (
                  <span className="text-muted-foreground">Calculando...</span>
                ) : reconciliation ? (
                  <>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <Row label="Fondo inicial" value={money(reconciliation.cash.openingFloat)} />
                      <Row label="Ventas en efectivo" value={money(reconciliation.cash.sales)} />
                      <Row label="Propinas en efectivo" value={money(reconciliation.cash.tips)} />
                      <Row label="Ingresos" value={money(reconciliation.cash.deposits + reconciliation.cash.adjustments)} />
                      <Row label="Retiros" value={`- ${money(reconciliation.cash.withdrawals)}`} />
                      <Row label="Gastos" value={`- ${money(reconciliation.cash.expenses)}`} />
                    </dl>

                    <div className="flex items-center justify-between border-t pt-2 font-medium">
                      <span>Efectivo esperado</span>
                      <span>{money(reconciliation.cash.expected)}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Otros medios ({reconciliation.other.count})</span>
                      <span>{money(reconciliation.other.total)}</span>
                    </div>

                    {reconciliation.proposed ? (
                      <div
                        className={`flex items-center justify-between rounded-md px-2 py-1 font-medium ${
                          reconciliation.proposed.difference === 0
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        <span>Diferencia</span>
                        <span>
                          {reconciliation.proposed.difference > 0 ? "+" : ""}
                          {money(reconciliation.proposed.difference)}
                        </span>
                      </div>
                    ) : null}

                    {reconciliation.alerts.length > 0 ? (
                      <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                        {reconciliation.alerts.map((alert) => (
                          <li key={alert.code}>• {alert.message}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Sin alertas: el turno cuadra con lo registrado.
                      </p>
                    )}

                    {reconciliation.pending.count > 0 ? (
                      <div className="flex flex-col gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2">
                        <div className="flex items-center justify-between text-xs font-medium text-amber-800 dark:text-amber-300">
                          <span>
                            Pagos por conciliar ({reconciliation.pending.count})
                          </span>
                          <span>{money(reconciliation.pending.amount)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          El cierre está bloqueado hasta confirmarlos o anularlos.
                        </p>
                        <ul className="flex flex-col gap-2">
                          {reconciliation.pending.items.map((payment) => (
                            <li
                              key={payment.id}
                              className="flex items-center justify-between gap-2 rounded-md bg-background/70 p-2"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-xs font-medium">
                                  {payment.order.isTakeaway
                                    ? "Para llevar"
                                    : payment.order.tableNumber
                                      ? `Mesa ${payment.order.tableNumber}`
                                      : "Cuenta"}{" "}
                                  · {money(payment.amount + payment.tipAmount)}
                                </p>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {payment.reference ?? "Sin referencia"} ·{" "}
                                  {payment.deviceId ?? "dispositivo"}
                                </p>
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => {
                                    setReconcileMode("CONFIRM")
                                    setReconcileReason("")
                                    setReconcilePending(payment)
                                  }}
                                >
                                  Confirmar
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setReconcileMode("REJECT")
                                    setReconcileReason("")
                                    setReconcilePending(payment)
                                  }}
                                >
                                  Anular
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    No pudimos cargar la conciliación.
                  </span>
                )}
              </div>
                ) : null}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                La conciliación se calcula al reconectar.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="close-notes">Notas (opcional)</Label>
            <Textarea
              id="close-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={500}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={pending || pendingReviewCount > 0}
          >
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            {offline.isOnline ? "Cerrar caja" : "Guardar cierre"}
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(reconcilePending)}
        onOpenChange={(open) => {
          if (!open && !reconciling) setReconcilePending(null)
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia
              className={
                reconcileMode === "REJECT"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }
            >
              <CreditCardIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {reconcileMode === "CONFIRM"
                ? "Confirmar cobro con tarjeta"
                : "Anular cobro con tarjeta"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {reconcilePending
                ? `${money(
                    reconcilePending.amount + reconcilePending.tipAmount
                  )} · ${reconcilePending.reference ?? "Sin referencia"} · ${
                    reconcilePending.deviceId ?? "dispositivo"
                  }. ${
                    reconcileMode === "CONFIRM"
                      ? "Se marcará como cobrado y se intentará cerrar la cuenta."
                      : "El pago quedará anulado y no se cobrará."
                  }`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {reconcileMode === "REJECT" ? (
            <div className="flex flex-col gap-2 px-4 pb-2">
              <Label htmlFor="reconcile-reason">Motivo</Label>
              <Textarea
                id="reconcile-reason"
                value={reconcileReason}
                onChange={(event) => setReconcileReason(event.target.value)}
                maxLength={200}
                rows={2}
                placeholder="Ej. el voucher no corresponde o la terminal no cobró"
              />
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={reconciling}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant={reconcileMode === "REJECT" ? "destructive" : "default"}
              disabled={
                reconciling ||
                (reconcileMode === "REJECT" &&
                  reconcileReason.trim().length < 3)
              }
              onClick={() => void resolvePending()}
            >
              {reconciling ? <Loader2Icon className="animate-spin" /> : null}
              {reconcileMode === "CONFIRM" ? "Confirmar cobro" : "Anular cobro"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function MovementDialog({
  open,
  onOpenChange,
  session,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: CashSession
  onDone: () => void
}) {
  const [type, setType] = React.useState<CashMovementType>("WITHDRAWAL")
  const [amount, setAmount] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [pending, setPending] = React.useState(false)

  const submit = async () => {
    const value = Number(amount)

    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Escribe un importe válido")
      return
    }

    if (!reason.trim()) {
      toast.error("Explica el motivo del movimiento")
      return
    }

    setPending(true)

    try {
      const result = await addCashMovement(session.id, {
        type,
        amount: Math.round(value * 100) / 100,
        reason: reason.trim(),
      })

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo registrar el movimiento")
        return
      }

      toast.success(`${CASH_MOVEMENT_LABELS[type]} registrado`)
      setAmount("")
      setReason("")
      onOpenChange(false)
      onDone()
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Movimiento de efectivo</DialogTitle>
          <DialogDescription>
            Retiros, ingresos o gastos que afectan el cajón del turno.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="movement-type">Tipo</Label>
            <Select
              value={type}
              onValueChange={(value) =>
                setType((value ?? "WITHDRAWAL") as CashMovementType)
              }
              items={MOVEMENT_TYPES.map((value) => ({
                value,
                label: CASH_MOVEMENT_LABELS[value],
              }))}
            >
              <SelectTrigger id="movement-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOVEMENT_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {CASH_MOVEMENT_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="movement-amount">Importe</Label>
            <Input
              id="movement-amount"
              type="number"
              inputMode="decimal"
              min="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="movement-reason">Motivo</Label>
            <Input
              id="movement-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={200}
              placeholder="Ej. Retiro para compra de hielo"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? (
              <Loader2Icon className="animate-spin" />
            ) : type === "DEPOSIT" ? (
              <ArrowUpFromLineIcon />
            ) : (
              <ArrowDownToLineIcon />
            )}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Fila de la conciliación: etiqueta a la izquierda, monto a la derecha. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </>
  )
}
