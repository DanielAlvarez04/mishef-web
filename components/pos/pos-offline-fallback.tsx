"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CloudOffIcon, MinusIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { useOfflineSync } from "@/components/offline/offline-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getCache } from "@/lib/offline/db"
import { POS_CACHE_SCOPES, tenantCacheKey } from "@/lib/offline/cache-keys"

interface CachedItem {
  id: string
  name: string
  price: string | number
}

/**
 * POS de contingencia.
 *
 * Se muestra cuando el servidor no pudo entregar la página del punto de venta.
 * Trabaja con la última copia del catálogo guardada en IndexedDB y encola la
 * cuenta completa: al volver la conexión, la cola crea la cuenta y la ronda con
 * las claves de idempotencia que ya usa el proveedor offline.
 */
export function PosOfflineFallback({
  organizationId,
  branchId,
}: {
  organizationId: string
  branchId: string | null
}) {
  const router = useRouter()
  const { enqueueRound, enqueueCheckout, isOnline } = useOfflineSync()
  const [pending, startTransition] = useTransition()

  const [items, setItems] = useState<CachedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<Record<string, number>>({})
  const [tableNumber, setTableNumber] = useState("")
  const [isTakeaway, setIsTakeaway] = useState(false)
  const [payNow, setPayNow] = useState(false)
  const [cashReceived, setCashReceived] = useState("")

  useEffect(() => {
    let cancelled = false

    void getCache<CachedItem[]>(
      tenantCacheKey(POS_CACHE_SCOPES.items, organizationId, branchId)
    )
      .then((cached) => {
        if (cancelled) return
        setItems(Array.isArray(cached) ? cached : [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [organizationId, branchId])

  const lines = items
    .filter((item) => (cart[item.id] ?? 0) > 0)
    .map((item) => ({
      item,
      quantity: cart[item.id],
      subtotal: Number(item.price) * cart[item.id],
    }))

  const total = lines.reduce((sum, line) => sum + line.subtotal, 0)

  function change(id: string, delta: number) {
    setCart((current) => {
      const next = { ...current }
      const value = (next[id] ?? 0) + delta

      if (value <= 0) delete next[id]
      else next[id] = value

      return next
    })
  }

  function enqueue() {
    if (lines.length === 0) {
      toast.error("Agrega al menos un artículo")
      return
    }

    if (!isTakeaway && !tableNumber.trim()) {
      toast.error("Escribe la mesa o marca para llevar")
      return
    }

    startTransition(async () => {
      const queuedItems = lines.map((line) => ({
        itemId: line.item.id,
        quantity: line.quantity,
      }))
      const label = `${isTakeaway ? "Para llevar" : `Mesa ${tableNumber.trim()}`} · ${lines.length} línea(s)`

      if (payNow) {
        const cash = Number(cashReceived || total)

        if (!Number.isFinite(cash) || cash < total) {
          toast.error("El efectivo recibido no cubre el total")
          return
        }

        await enqueueCheckout({
          order: {
            tableNumber: isTakeaway ? undefined : tableNumber.trim(),
            isTakeaway,
          },
          round: { items: queuedItems },
          amount: total,
          tipAmount: 0,
          tipSource: "NONE",
          cashReceived: cash,
          changeGiven: Math.max(0, Math.round((cash - total) * 100) / 100),
          closeOrder: true,
          total,
          label: `${label} · efectivo sin conexión`,
        })

        toast.success("Venta guardada en este dispositivo", {
          description:
            "Se enviará al reconectar: primero la cuenta y la comanda, luego el pago y el cierre.",
        })
      } else {
        await enqueueRound({
          tableNumber: isTakeaway ? undefined : tableNumber.trim(),
          isTakeaway,
          items: queuedItems,
          total,
          label,
        })

        toast.success("Cuenta guardada", {
          description:
            "Se enviará sola cuando vuelva la conexión. No la cobres hasta confirmarla.",
        })
      }

      setCart({})
      setTableNumber("")
      setPayNow(false)
      setCashReceived("")
      router.refresh()
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
        <CloudOffIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">
            Sin conexión con el servidor · datos locales
          </span>
          <span className="text-muted-foreground">
            Estás viendo el catálogo guardado en este dispositivo. Las cuentas
            que registres quedan en cola y se envían solas al reconectar.
            {isOnline ? " La red parece activa: reintentando." : ""}
          </span>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando catálogo local…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay catálogo guardado en este dispositivo. Abre el POS una vez con
          conexión para poder trabajar sin red.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{item.name}</span>
                  <span className="text-muted-foreground">
                    ${Number(item.price).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    aria-label={`Quitar ${item.name}`}
                    onClick={() => change(item.id, -1)}
                  >
                    <MinusIcon />
                  </Button>
                  <span className="w-6 text-center tabular-nums">
                    {cart[item.id] ?? 0}
                  </span>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    aria-label={`Agregar ${item.name}`}
                    onClick={() => change(item.id, 1)}
                  >
                    <PlusIcon />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Mesa"
                value={tableNumber}
                disabled={isTakeaway}
                onChange={(event) => setTableNumber(event.target.value)}
              />
              <Button
                type="button"
                variant={isTakeaway ? "default" : "outline"}
                size="sm"
                onClick={() => setIsTakeaway((value) => !value)}
              >
                Llevar
              </Button>
            </div>

            <div className="flex flex-col gap-1 text-sm">
              {lines.map((line) => (
                <div
                  key={line.item.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate">
                    {line.quantity} × {line.item.name}
                  </span>
                  <span className="tabular-nums">
                    ${line.subtotal.toFixed(2)}
                  </span>
                </div>
              ))}
              {lines.length === 0 ? (
                <span className="text-muted-foreground">Sin artículos</span>
              ) : null}
            </div>

            <div className="flex items-center justify-between border-t pt-2 text-sm font-medium">
              <span>Total estimado</span>
              <span className="tabular-nums">${total.toFixed(2)}</span>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={payNow}
                onChange={(event) => setPayNow(event.target.checked)}
                className="size-4 accent-primary"
              />
              Cobrar en efectivo ahora
            </label>

            {payNow ? (
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                value={cashReceived}
                placeholder={total.toFixed(2)}
                onChange={(event) => setCashReceived(event.target.value)}
                aria-label="Efectivo recibido"
              />
            ) : null}

            <Button type="button" onClick={enqueue} disabled={pending}>
              {pending
                ? "Guardando..."
                : payNow
                  ? "Guardar venta cobrada"
                  : "Guardar cuenta en cola"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
