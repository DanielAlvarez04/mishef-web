"use client"

import * as React from "react"
import { BanknoteIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { useOfflineSync } from "@/components/offline/offline-provider"
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
import { useMoney } from "@/lib/currency"
import { orderLabel, type Order } from "@/lib/orders"

/**
 * Cobro en efectivo de una cuenta abierta cuando no hay conexión.
 *
 * Solo se ofrece a roles que pueden confirmar pagos y con una caja abierta. La
 * venta se guarda en el dispositivo y se envía al reconectar: primero el pago
 * confirmado y después el cierre de la cuenta. Nunca se anuncia como cobrada
 * hasta que el servidor lo confirma.
 */
export function OfflineCheckoutDialog({
  order,
  open,
  onOpenChange,
  onQueued,
}: {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
  onQueued: () => void
}) {
  const money = useMoney()
  const offline = useOfflineSync()
  const [cashInput, setCashInput] = React.useState("")
  const [tipInput, setTipInput] = React.useState("")
  const [pending, setPending] = React.useState(false)

  const confirmed = (order.payments ?? [])
    .filter((payment) => payment.status === "CONFIRMED")
    .reduce((sum, payment) => sum + Number(payment.amount), 0)
  const pendingAmount = (order.payments ?? [])
    .filter((payment) => payment.status === "PENDING")
    .reduce((sum, payment) => sum + Number(payment.amount), 0)
  const balance = Math.max(Number(order.total) - confirmed, 0)
  const available = Math.max(balance - pendingAmount, 0)
  const tip = Math.max(Number(tipInput) || 0, 0)
  const total = Math.round((available + tip) * 100) / 100
  const cash = cashInput.trim()
    ? Math.max(Number(cashInput) || 0, 0)
    : total
  const change = Math.round((cash - total) * 100) / 100

  async function submit() {
    if (pendingAmount > 0.004) {
      toast.error(
        "Hay pagos pendientes de confirmar. Confírmalos o anúlalos antes de cobrar en efectivo.",
      )
      return
    }

    if (available <= 0) {
      toast.error("Esta cuenta ya no tiene saldo por cobrar.")
      return
    }

    if (cash < total) {
      toast.error("El efectivo recibido no cubre el total.")
      return
    }

    setPending(true)

    try {
      await offline.enqueueCheckout({
        orderId: order.id,
        amount: available,
        tipAmount: tip,
        tipPercent:
          tip > 0 && available > 0
            ? Math.round((tip / available) * 10000) / 100
            : null,
        tipBaseAmount: available,
        tipSource: tip > 0 ? "CUSTOM" : "NONE",
        cashReceived: Math.round(cash * 100) / 100,
        changeGiven: Math.max(0, change),
        closeOrder: true,
        total,
        label: `${orderLabel(order)} · efectivo sin conexión`,
      })

      toast.success("Cobro guardado en este dispositivo", {
        description:
          "Se enviará al reconectar. La cuenta no se cierra hasta que el servidor lo confirme.",
      })
      onOpenChange(false)
      onQueued()
    } catch {
      toast.error("No se pudo guardar el cobro en este dispositivo.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BanknoteIcon className="size-4" />
            Cobro en efectivo sin conexión
          </DialogTitle>
          <DialogDescription>
            {orderLabel(order)} · saldo {money(available)}. Se guarda en el
            dispositivo y se sincroniza al volver la red.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="offline-cash">Efectivo recibido</Label>
            <Input
              id="offline-cash"
              type="number"
              inputMode="decimal"
              min="0"
              value={cashInput}
              placeholder={total.toFixed(2)}
              onChange={(event) => setCashInput(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="offline-tip">Propina (opcional)</Label>
            <Input
              id="offline-tip"
              type="number"
              inputMode="decimal"
              min="0"
              value={tipInput}
              placeholder="0.00"
              onChange={(event) => setTipInput(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Total a cobrar</span>
              <span className="font-medium tabular-nums">{money(total)}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Cambio</span>
              <span className="tabular-nums">
                {money(Math.max(0, change))}
              </span>
            </div>
          </div>

          {pendingAmount > 0.004 ? (
            <p className="text-xs text-destructive">
              Hay {money(pendingAmount)} en pagos por confirmar. No se puede
              cerrar la cuenta en efectivo hasta resolverlos.
            </p>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Este movimiento se enviará al reconectar. Hasta entonces la cuenta
            seguirá abierta en el servidor y cocina no recibirá cambios nuevos.
          </p>
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
            onClick={() => void submit()}
            disabled={pending || cash < total || available <= 0 || pendingAmount > 0.004}
          >
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            Guardar cobro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
