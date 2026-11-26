"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  FlameIcon,
  HandPlatterIcon,
  Maximize2Icon,
  Minimize2Icon,
  RefreshCwIcon,
  TimerIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { API_BASE_URL } from "@/lib/api-base"
import {
  KITCHEN_TICKET_STATUS_LABELS,
  kitchenOrderLabel,
  type KitchenBoard,
  type KitchenTicket,
  type KitchenTicketStatus,
} from "@/lib/kitchen-tickets"
import { transitionKitchenTicket } from "@/lib/order-actions"
import { useWakeLock } from "@/hooks/use-wake-lock"
import { formatTime } from "@/lib/catalog"
import { cn } from "cn"

const STATUS_ICONS: Record<KitchenTicketStatus, React.ReactNode> = {
  PENDING: <TimerIcon className="size-4" />,
  PREPARING: <FlameIcon className="size-4" />,
  READY: <HandPlatterIcon className="size-4" />,
  PICKED_UP: <CircleCheckIcon className="size-4" />,
  DELIVERED: <CircleCheckIcon className="size-4" />,
  CANCELLED: <CircleCheckIcon className="size-4" />,
}

const STATUS_BADGE: Record<KitchenTicketStatus, string> = {
  PENDING: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  PREPARING: "border-primary/40 bg-primary/10 text-primary",
  READY: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  PICKED_UP: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  DELIVERED: "border-muted-foreground/30 bg-muted text-muted-foreground",
  CANCELLED: "border-destructive/40 bg-destructive/10 text-destructive",
}

function elapsedMinutes(from: string | null, now: number): string {
  if (!from) return "—"
  const minutes = Math.max(
    0,
    Math.floor((now - new Date(from).getTime()) / 60_000)
  )
  return `${minutes} min`
}

/**
 * Tablero de cocina en modo Avanzado.
 *
 * Los tickets se agrupan por estación. En pantallas grandes se ven todas las
 * estaciones; en móvil se navega con tabs. Se refresca por SSE y por sondeo.
 */
export function AdvancedKitchenView({
  board,
  roles,
  serverNow,
}: {
  board: KitchenBoard
  roles: string[]
  serverNow: string
}) {
  useWakeLock()
  const router = useRouter()
  const [now, setNow] = React.useState(() => new Date(serverNow).getTime())
  const [activeStation, setActiveStation] = React.useState(
    board.stations[0]?.id ?? ""
  )
  const [pendingId, setPendingId] = React.useState<string | null>(null)
  const [fullscreen, setFullscreen] = React.useState(false)

  const canWork = roles.some((role) => ["ADMIN", "KITCHEN"].includes(role))
  const canPickup = roles.some((role) => ["ADMIN", "WAITER"].includes(role))
  const activeStationId = activeStation || board.stations[0]?.id || ""

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  React.useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 10_000)
    return () => window.clearInterval(timer)
  }, [router])

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      return
    }

    const source = new EventSource(`${API_BASE_URL}/kitchen/stream`, {
      withCredentials: true,
    })

    const refresh = () => router.refresh()

    source.addEventListener("message", refresh)
    source.onerror = () => {
      // El sondeo de 10 s cubre la caída del SSE.
    }

    return () => source.close()
  }, [router])

  async function transition(
    ticket: KitchenTicket,
    status: KitchenTicketStatus
  ) {
    setPendingId(ticket.id)

    try {
      const result = await transitionKitchenTicket(ticket.id, status)

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo cambiar el ticket")
        return
      }

      const warnings = (
        result.data as { warnings?: Array<{ message?: string }> } | undefined
      )?.warnings

      if (warnings?.length) {
        toast.warning(warnings[0]?.message ?? "Revisa el inventario")
      }

      toast.success(
        status === "PICKED_UP"
          ? "Ticket recogido"
          : status === "DELIVERED"
            ? "Ticket entregado"
            : status === "READY"
              ? "Ticket listo"
              : "Ticket en preparación"
      )
      router.refresh()
    } finally {
      setPendingId(null)
    }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        setFullscreen(false)
      } else {
        await document.documentElement.requestFullscreen()
        setFullscreen(true)
      }
    } catch {
      // iOS y algunos navegadores pueden bloquearlo.
    }
  }

  const ticketsFor = (stationId: string) =>
    board.tickets.filter((ticket) => ticket.station.id === stationId)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Cocina
          </h1>
          <p className="text-xs text-muted-foreground">
            {board.tickets.length} ticket
            {board.tickets.length === 1 ? "" : "s"} activo
            {board.tickets.length === 1 ? "" : "s"} · modo Avanzado
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => router.refresh()}
          aria-label="Actualizar"
          title="Actualizar"
        >
          <RefreshCwIcon />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => void toggleFullscreen()}
          aria-label={
            fullscreen ? "Salir de pantalla completa" : "Pantalla completa"
          }
          title={
            fullscreen ? "Salir de pantalla completa" : "Pantalla completa"
          }
        >
          {fullscreen ? <Minimize2Icon /> : <Maximize2Icon />}
        </Button>
      </div>

      {board.stations.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No hay estaciones activas. Configura la cocina en Configuración →
          Cocina.
        </p>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {board.stations.map((station) => {
              const active = activeStationId === station.id
              const count = ticketsFor(station.id).length

              return (
                <button
                  key={station.id}
                  type="button"
                  onClick={() => setActiveStation(station.id)}
                  aria-pressed={active}
                  className={cn(
                    "flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground"
                  )}
                >
                  {station.name}
                  <Badge variant={active ? "secondary" : "outline"}>
                    {count}
                  </Badge>
                </button>
              )
            })}
          </div>

          <div className="grid gap-3 max-lg:landscape:grid-cols-[repeat(3,minmax(18rem,1fr))] max-lg:landscape:overflow-x-auto max-lg:landscape:pb-1 lg:grid-cols-3">
            {board.stations.map((station) => {
              const tickets = ticketsFor(station.id).sort((left, right) => {
                const order = [
                  "PENDING",
                  "PREPARING",
                  "READY",
                  "PICKED_UP",
                ]
                return (
                  order.indexOf(left.status) - order.indexOf(right.status)
                )
              })

              return (
                <section
                  key={station.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border bg-muted/20 p-3",
                    activeStationId !== station.id && "max-lg:portrait:hidden"
                  )}
                >
                  <header className="flex items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 font-medium">
                      <span
                        aria-hidden
                        className="size-2.5 rounded-full border"
                        style={{ backgroundColor: station.color ?? undefined }}
                      />
                      {station.name}
                    </h2>
                    <Badge variant="outline">{tickets.length}</Badge>
                  </header>

                  {tickets.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                      Sin tickets.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {tickets.map((ticket) => (
                        <TicketCard
                          key={ticket.id}
                          ticket={ticket}
                          now={now}
                          canWork={canWork}
                          canPickup={canPickup}
                          pending={pendingId === ticket.id}
                          onTransition={transition}
                        />
                      ))}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function TicketCard({
  ticket,
  now,
  canWork,
  canPickup,
  pending,
  onTransition,
}: {
  ticket: KitchenTicket
  now: number
  canWork: boolean
  canPickup: boolean
  pending: boolean
  onTransition: (
    ticket: KitchenTicket,
    status: KitchenTicketStatus
  ) => Promise<void>
}) {
  const sentAt = ticket.orderRound.sentAt ?? ticket.orderRound.createdAt

  return (
    <li className="rounded-lg border bg-card p-3 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {kitchenOrderLabel(ticket)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Ronda {ticket.orderRound.id.slice(-4)} ·{" "}
            {formatTime(sentAt)} · {elapsedMinutes(sentAt, now)}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn("gap-1", STATUS_BADGE[ticket.status])}
        >
          {STATUS_ICONS[ticket.status]}
          {KITCHEN_TICKET_STATUS_LABELS[ticket.status]}
        </Badge>
      </div>

      <ul className="mt-2 flex flex-col gap-1.5 border-t pt-2">
        {ticket.items.map((ticketItem) => {
          const item = ticketItem.orderItem
          const modifiers = [
            ...item.options.map(
              (option) => option.kitchenLabel ?? option.optionName
            ),
            ...item.extras.map((extra) => `+ ${extra.extraName}`),
            ...item.exclusions.map(
              (exclusion) => `sin ${exclusion.ingredient.name}`
            ),
          ]

          return (
            <li key={ticketItem.id} className="text-sm">
              <span className="font-medium tabular-nums">
                {item.quantity}×
              </span>{" "}
              {item.itemName}
              {item.variantName ? ` (${item.variantName})` : ""}
              {item.guestName ? (
                <span className="text-muted-foreground"> · {item.guestName}</span>
              ) : null}
              {modifiers.length > 0 ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {modifiers.join(" · ")}
                </span>
              ) : null}
              {item.notes ? (
                <span className="mt-0.5 block text-xs font-medium text-amber-700 dark:text-amber-300">
                  {item.notes}
                </span>
              ) : null}
            </li>
          )
        })}
      </ul>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {ticket.status === "PENDING" && canWork ? (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => void onTransition(ticket, "PREPARING")}
          >
            <ChevronRightIcon />
            Empezar
          </Button>
        ) : null}

        {ticket.status === "PREPARING" && canWork ? (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => void onTransition(ticket, "READY")}
          >
            <ChevronRightIcon />
            Listo
          </Button>
        ) : null}

        {ticket.status === "READY" && canPickup ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => void onTransition(ticket, "PICKED_UP")}
          >
            <ChevronLeftIcon />
            Recoger
          </Button>
        ) : null}

        {ticket.status === "PICKED_UP" && canPickup ? (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => void onTransition(ticket, "DELIVERED")}
          >
            <CircleCheckIcon />
            Entregar
          </Button>
        ) : null}

        {ticket.status === "READY" && canWork && !canPickup ? (
          <span className="text-xs text-muted-foreground">
            Esperando al mesero en el pase.
          </span>
        ) : null}
      </div>
    </li>
  )
}
