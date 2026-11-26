"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  CircleXIcon,
  FlameIcon,
  HandPlatterIcon,
  Maximize2Icon,
  Minimize2Icon,
  PrinterIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  TimerIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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
import { API_BASE_URL } from "@/lib/api-base"
import {
  KITCHEN_TICKET_STATUS_LABELS,
  kitchenOrderLabel,
  type KitchenBoard,
  type KitchenTicket,
  type KitchenTicketHistoryEntry,
  type KitchenTicketStatus,
} from "@/lib/kitchen-tickets"
import {
  expoValidateKitchenTicket,
  fireKitchenRound,
  getKitchenTicketHistory,
  refireKitchenTicket,
  transitionKitchenTicket,
} from "@/lib/order-actions"
import { useWakeLock } from "@/hooks/use-wake-lock"
import { formatDateTime, formatTime } from "@/lib/catalog"
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
  const [pendingRoundId, setPendingRoundId] = React.useState<string | null>(
    null
  )
  const [cancelTicket, setCancelTicket] = React.useState<KitchenTicket | null>(
    null
  )
  const [cancelReason, setCancelReason] = React.useState("")
  const [refireTicket, setRefireTicket] = React.useState<KitchenTicket | null>(
    null
  )
  const [refirePending, setRefirePending] = React.useState(false)
  const [printTicket, setPrintTicket] = React.useState<KitchenTicket | null>(
    null
  )
  const [view, setView] = React.useState<"stations" | "expo" | "recent">(
    "stations"
  )
  const [expoPendingId, setExpoPendingId] = React.useState<string | null>(null)
  const [historyTicket, setHistoryTicket] = React.useState<KitchenTicket | null>(
    null
  )
  const [history, setHistory] = React.useState<KitchenTicketHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = React.useState(false)
  const [fullscreen, setFullscreen] = React.useState(false)

  const canWork = roles.some((role) => ["ADMIN", "KITCHEN"].includes(role))
  const canPickup = roles.some((role) => ["ADMIN", "WAITER"].includes(role))
  const canExpo = canWork
  const expoTickets = board.tickets.filter(
    (ticket) => ticket.status === "READY" || ticket.status === "PICKED_UP"
  )
  const recentTickets = board.recentTickets ?? []
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

  React.useEffect(() => {
    if (!printTicket) return

    const clear = () => setPrintTicket(null)

    document.body.dataset.printing = "ticket"
    const frame = window.requestAnimationFrame(() => window.print())
    window.addEventListener("afterprint", clear)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("afterprint", clear)
      delete document.body.dataset.printing
    }
  }, [printTicket])

  async function transition(
    ticket: KitchenTicket,
    status: KitchenTicketStatus,
    reason?: string
  ) {
    setPendingId(ticket.id)

    try {
      const result = await transitionKitchenTicket(ticket.id, status, reason)

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

  async function fireRound(roundId: string) {
    setPendingRoundId(roundId)

    try {
      const result = await fireKitchenRound(roundId)

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo disparar la ronda")
        return
      }

      toast.success("Ronda disparada a las estaciones")
      router.refresh()
    } finally {
      setPendingRoundId(null)
    }
  }

  async function validateExpo(ticket: KitchenTicket) {
    setExpoPendingId(ticket.id)

    try {
      const result = await expoValidateKitchenTicket(ticket.id)

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo validar el pase")
        return
      }

      toast.success("Pase validado")
      router.refresh()
    } finally {
      setExpoPendingId(null)
    }
  }

  async function refire(ticket: KitchenTicket) {
    setRefirePending(true)

    try {
      const result = await refireKitchenTicket(ticket.id)

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo rehacer el ticket")
        return
      }

      toast.success("Ticket rehecho: nueva comanda creada")
      setRefireTicket(null)
      router.refresh()
    } finally {
      setRefirePending(false)
    }
  }

  async function openHistory(ticket: KitchenTicket) {
    setHistoryTicket(ticket)
    setHistory([])
    setHistoryLoading(true)

    try {
      const result = await getKitchenTicketHistory(ticket.id)

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo cargar el historial")
        return
      }

      setHistory(result.data ?? [])
    } finally {
      setHistoryLoading(false)
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
        <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-0.5">
          <Button
            type="button"
            size="sm"
            variant={view === "stations" ? "default" : "ghost"}
            onClick={() => setView("stations")}
          >
            Estaciones
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "expo" ? "default" : "ghost"}
            onClick={() => setView("expo")}
          >
            Pase
            <Badge variant="outline">{expoTickets.length}</Badge>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "recent" ? "default" : "ghost"}
            onClick={() => setView("recent")}
          >
            Recientes
            <Badge variant="outline">{recentTickets.length}</Badge>
          </Button>
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

      {board.heldRounds?.length ? (
        <section className="rounded-xl border border-dashed bg-amber-500/5 p-3">
          <header className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <TimerIcon className="size-4" />
              Rondas en espera
            </h2>
            <Badge variant="outline">{board.heldRounds.length}</Badge>
          </header>
          <ul className="mt-2 flex flex-col gap-2">
            {board.heldRounds.map((round) => {
              const label = round.order.tableNumber
                ? `Mesa ${round.order.tableNumber}`
                : round.order.channel === "COUNTER"
                  ? "Mostrador"
                  : round.order.channel === "PHONE"
                    ? "Drive-Thru"
                    : "Domicilio"
              const itemCount = round.items.reduce(
                (sum, item) => sum + item.quantity,
                0
              )

              return (
                <li
                  key={round.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {itemCount} artículo{itemCount === 1 ? "" : "s"} ·{" "}
                      {elapsedMinutes(
                        round.sentAt ?? round.createdAt,
                        now
                      )}
                    </span>
                  </span>
                  {canWork || canPickup ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={pendingRoundId === round.id}
                      onClick={() => void fireRound(round.id)}
                    >
                      <FlameIcon />
                      Disparar
                    </Button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {view === "expo" ? (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Tickets listos o recogidos. Valida la calidad en el pase antes de
            que el mesero los retire.
          </p>
          {expoTickets.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No hay tickets listos en el pase.
            </p>
          ) : (
            <ul className="grid gap-3 lg:grid-cols-3">
              {expoTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  now={now}
                  canWork={canWork}
                  canPickup={canPickup}
                  canExpo={canExpo}
                  expoPending={expoPendingId === ticket.id}
                  pending={pendingId === ticket.id}
                  refirePending={refirePending}
                  onTransition={transition}
                  onRequestCancel={setCancelTicket}
                  onRequestRefire={setRefireTicket}
                  onValidateExpo={(entry) => void validateExpo(entry)}
                  onOpenHistory={(entry) => void openHistory(entry)}
                  onPrint={setPrintTicket}
                />
              ))}
            </ul>
          )}
        </section>
      ) : view === "recent" ? (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Tickets entregados o anulados en las últimas 4 horas. Puedes
            consultar su historial, reimprimirlos o rehacerlos.
          </p>
          {recentTickets.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No hay tickets cerrados en las últimas 4 horas.
            </p>
          ) : (
            <ul className="grid gap-3 lg:grid-cols-3">
              {recentTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  now={now}
                  canWork={canWork}
                  canPickup={canPickup}
                  canExpo={canExpo}
                  expoPending={expoPendingId === ticket.id}
                  pending={pendingId === ticket.id}
                  refirePending={refirePending}
                  onTransition={transition}
                  onRequestCancel={setCancelTicket}
                  onRequestRefire={setRefireTicket}
                  onValidateExpo={(entry) => void validateExpo(entry)}
                  onOpenHistory={(entry) => void openHistory(entry)}
                  onPrint={setPrintTicket}
                />
              ))}
            </ul>
          )}
        </section>
      ) : board.stations.length === 0 ? (
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
                          canExpo={canExpo}
                          expoPending={expoPendingId === ticket.id}
                          pending={pendingId === ticket.id}
                          refirePending={refirePending}
                          onTransition={transition}
                          onRequestCancel={setCancelTicket}
                          onRequestRefire={setRefireTicket}
                          onValidateExpo={(entry) => void validateExpo(entry)}
                          onOpenHistory={(entry) => void openHistory(entry)}
                          onPrint={setPrintTicket}
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

      <AlertDialog
        open={Boolean(cancelTicket)}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTicket(null)
            setCancelReason("")
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <CircleXIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>¿Anular ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              Se cancelará el ticket de la estación y la ronda recalculará su
              estado. Indica el motivo para la auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            placeholder="Motivo (ej. error de captura)"
            maxLength={200}
            aria-label="Motivo de anulación"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Conservar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={cancelReason.trim().length < 2}
              onClick={() => {
                if (!cancelTicket) return
                void transition(
                  cancelTicket,
                  "CANCELLED",
                  cancelReason.trim()
                )
                setCancelTicket(null)
                setCancelReason("")
              }}
            >
              Anular ticket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(refireTicket)}
        onOpenChange={(open) => {
          if (!open) setRefireTicket(null)
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <RotateCcwIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>¿Rehacer ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              Se creará una comanda nueva en la misma estación con los mismos
              ítems. El ticket original se conserva en el historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Conservar</AlertDialogCancel>
            <AlertDialogAction
              disabled={refirePending}
              onClick={() => {
                if (!refireTicket) return
                void refire(refireTicket)
              }}
            >
              Rehacer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(historyTicket)}
        onOpenChange={(open) => !open && setHistoryTicket(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Historial del ticket</DialogTitle>
            <DialogDescription>
              {historyTicket
                ? `${kitchenOrderLabel(historyTicket)} · ronda ${historyTicket.orderRound.id.slice(-4)}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {historyLoading ? (
            <p className="text-sm text-muted-foreground">Cargando historial…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin movimientos registrados.
            </p>
          ) : (
            <ol className="flex max-h-80 flex-col gap-2 overflow-y-auto">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-col gap-0.5 rounded-lg border p-2.5 text-sm"
                >
                  <span className="flex flex-wrap items-center gap-1.5">
                    {entry.previousStatus ? (
                      <span className="text-muted-foreground">
                        {KITCHEN_TICKET_STATUS_LABELS[entry.previousStatus]} →{" "}
                      </span>
                    ) : null}
                    <span className="font-medium">
                      {KITCHEN_TICKET_STATUS_LABELS[entry.newStatus]}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(entry.changedAt)}
                    {entry.changedByName ? ` · ${entry.changedByName}` : ""}
                  </span>
                  {entry.reason ? (
                    <span className="text-xs text-muted-foreground">
                      {entry.reason}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </DialogContent>
      </Dialog>

      <KitchenTicketPrint ticket={printTicket} />
    </div>
  )
}

function KitchenTicketPrint({ ticket }: { ticket: KitchenTicket | null }) {
  if (!ticket) return null

  const sentAt = ticket.orderRound.sentAt ?? ticket.orderRound.createdAt

  return (
    <div className="kitchen-print-area hidden print:block">
      <p className="text-center text-[15px] font-bold uppercase tracking-wide">
        {ticket.station.name}
      </p>
      <p className="text-center text-[10px] uppercase tracking-[0.2em]">
        Comanda de cocina
      </p>

      <div className="my-2 border-y border-dashed border-black py-1">
        <p className="text-[12px] font-semibold">{kitchenOrderLabel(ticket)}</p>
        <p className="text-[11px]">
          Ronda {ticket.orderRound.id.slice(-4)} · {formatTime(sentAt)}
        </p>
        {ticket.orderRound.order.customerName ? (
          <p className="text-[11px]">
            Cliente: {ticket.orderRound.order.customerName}
          </p>
        ) : null}
        {ticket.orderRound.order.isTakeaway ? (
          <p className="text-[11px] font-semibold">Para llevar</p>
        ) : null}
      </div>

      <ul className="flex flex-col gap-1.5">
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
            <li key={ticketItem.id} className="text-[12px]">
              <span className="font-bold tabular-nums">{item.quantity}×</span>{" "}
              {item.itemName}
              {item.variantName ? ` (${item.variantName})` : ""}
              {item.guestName ? ` · ${item.guestName}` : ""}
              {modifiers.length > 0 ? (
                <span className="block text-[11px]">
                  {modifiers.join(" · ")}
                </span>
              ) : null}
              {item.notes ? (
                <span className="block text-[11px] font-bold">
                  NOTA: {item.notes}
                </span>
              ) : null}
            </li>
          )
        })}
      </ul>

      <p className="mt-2 border-t border-dashed border-black pt-1 text-[10px]">
        Impreso {formatDateTime(new Date().toISOString())}
      </p>
    </div>
  )
}

function TicketCard({
  ticket,
  now,
  canWork,
  canPickup,
  canExpo,
  expoPending,
  pending,
  refirePending,
  onTransition,
  onRequestCancel,
  onRequestRefire,
  onValidateExpo,
  onOpenHistory,
  onPrint,
}: {
  ticket: KitchenTicket
  now: number
  canWork: boolean
  canPickup: boolean
  canExpo: boolean
  expoPending: boolean
  pending: boolean
  refirePending: boolean
  onTransition: (
    ticket: KitchenTicket,
    status: KitchenTicketStatus,
    reason?: string
  ) => Promise<void>
  onRequestCancel: (ticket: KitchenTicket) => void
  onRequestRefire: (ticket: KitchenTicket) => void
  onValidateExpo: (ticket: KitchenTicket) => void
  onOpenHistory: (ticket: KitchenTicket) => void
  onPrint: (ticket: KitchenTicket) => void
}) {
  const sentAt = ticket.orderRound.sentAt ?? ticket.orderRound.createdAt
  const prepMinutes = ticket.startedAt
    ? Math.max(
        0,
        Math.floor(
          ((ticket.readyAt
            ? new Date(ticket.readyAt).getTime()
            : now) -
            new Date(ticket.startedAt).getTime()) /
            60_000
        )
      )
    : 0
  const targetMinutes =
    ticket.station.slaMinutes ?? ticket.orderRound.estimatedMinutes ?? 15
  const late =
    prepMinutes > targetMinutes &&
    ["PREPARING", "READY"].includes(ticket.status)

  return (
    <li
      className={cn(
        "rounded-lg border bg-card p-3 shadow-xs",
        late && "border-destructive/50"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {kitchenOrderLabel(ticket)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Ronda {ticket.orderRound.id.slice(-4)} ·{" "}
            {formatTime(sentAt)} · {elapsedMinutes(sentAt, now)}
            {ticket.startedAt ? ` · Prep. ${prepMinutes} min` : ""}
            {late ? (
              <span className="ml-1 font-medium text-destructive">
                · Atrasado
              </span>
            ) : null}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn("gap-1", STATUS_BADGE[ticket.status])}
        >
          {STATUS_ICONS[ticket.status]}
          {KITCHEN_TICKET_STATUS_LABELS[ticket.status]}
        </Badge>
        {ticket.expoAt ? (
          <Badge
            variant="outline"
            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          >
            Pase validado
          </Badge>
        ) : null}
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

        {canExpo &&
        !ticket.expoAt &&
        ["READY", "PICKED_UP"].includes(ticket.status) ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={expoPending}
            onClick={() => onValidateExpo(ticket)}
          >
            <CircleCheckIcon />
            Validar pase
          </Button>
        ) : null}

        {canWork &&
        ["CANCELLED", "DELIVERED"].includes(ticket.status) ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={refirePending}
            onClick={() => onRequestRefire(ticket)}
          >
            <RotateCcwIcon />
            Rehacer
          </Button>
        ) : null}

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onPrint(ticket)}
        >
          <PrinterIcon />
          Imprimir
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onOpenHistory(ticket)}
        >
          Historial
        </Button>

        {canWork &&
        ["PENDING", "PREPARING", "READY"].includes(ticket.status) ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ml-auto text-destructive hover:text-destructive"
            disabled={pending}
            onClick={() => onRequestCancel(ticket)}
          >
            Anular
          </Button>
        ) : null}
      </div>
    </li>
  )
}
