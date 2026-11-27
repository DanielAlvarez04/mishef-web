"use client"

import * as React from "react"
import {
  ArrowUpIcon,
  BanIcon,
  BanknoteIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  Loader2Icon,
  PencilLineIcon,
  PrinterIcon,
  XIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Item,
  ItemGroup,
  ItemSeparator,
} from "@/components/ui/item"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetClose,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useMoney } from "@/lib/currency"
import {
  countPendingDeliveryRounds,
  ticketCode,
  type KitchenRound,
  type Order,
  type OrderChannel,
} from "@/lib/orders"
import {
  groupServiceItems,
  KITCHEN_PROCESS_STATUSES,
  KITCHEN_READY_STATUSES,
  type GroupedServiceItem,
} from "@/lib/pos-service"
import { cn } from "@/lib/utils"
import { PosChannelIcon } from "./pos-channel-icon"
import { SwipeableSheetContent } from "./swipeable-sheet-content"

export type ServiceQueueMode = "kitchen" | "ready" | "pending"

const MODE_CONTENT: Record<
  ServiceQueueMode,
  { title: string; description: string; empty: string }
> = {
  kitchen: {
    title: "Pedidos en cocina",
    description: "Rondas que cocina todavía está preparando o por empezar.",
    empty: "No hay pedidos en cocina.",
  },
  ready: {
    title: "Pedidos listos",
    description: "Rondas listas para llevar a la mesa del comensal.",
    empty: "No hay pedidos listos para entregar.",
  },
  pending: {
    title: "Cuentas abiertas",
    description: "Elige una cuenta para cargarla en la comanda.",
    empty: "No hay cuentas abiertas.",
  },
}

function serviceLabel(
  channel: OrderChannel | null | undefined,
  tableNumber: string | null
) {
  if (tableNumber) return `Mesa ${tableNumber}`
  if (channel === "COUNTER") return "Mostrador"
  if (channel === "PHONE") return "Drive-Thru"
  if (channel === "DELIVERY") return "Domicilio"

  return "Mesa"
}

function timeLabel(value: string | null) {
  if (!value) return ""
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ""

  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function QueueHeader({
  count,
  title,
  description,
}: {
  count: number
  title: string
  description: string
}) {
  return (
    <SheetHeader className="border-b">
      <div className="flex items-start justify-between gap-2">
        <div
          data-sheet-drag-handle
          className="flex min-w-0 touch-none flex-col gap-1"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums">
              {count}
            </span>
            <SheetTitle>{title}</SheetTitle>
          </div>
          <SheetDescription>{description}</SheetDescription>
        </div>
        <SheetClose
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Cerrar"
            />
          }
        >
          <XIcon />
        </SheetClose>
      </div>
    </SheetHeader>
  )
}

function ItemsCollapsible({ items }: { items: GroupedServiceItem[] }) {
  const [open, setOpen] = React.useState(false)

  if (items.length === 0) return null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        type="button"
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDownIcon
          className={cn(
            "size-3.5 transition-transform",
            open && "rotate-180"
          )}
        />
        Artículos
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="flex flex-col gap-1 pt-2 text-xs text-muted-foreground">
          {items.map((item) => (
            <li key={item.key} className="truncate">
              {item.quantity}× {item.name}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}

function ItemHeading({
  channel,
  tableNumber,
  ticketNumber,
  prioritized,
  paid,
  amount,
  secondary,
  onEdit,
  editDisabled,
  editTitle,
}: {
  channel: OrderChannel | null | undefined
  tableNumber: string | null
  ticketNumber?: number | null
  prioritized?: boolean
  paid?: boolean
  amount?: string
  secondary?: string
  onEdit: () => void
  editDisabled?: boolean
  editTitle?: string
}) {
  const ticket = ticketCode(ticketNumber)

  return (
    <div className="flex w-full items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <PosChannelIcon
            channel={channel}
            className="size-4 shrink-0 text-muted-foreground"
          />
          <span className="shrink-0 text-sm font-medium">
            {serviceLabel(channel, tableNumber)}
          </span>
          {ticket ? (
            <span className="shrink-0 text-xs text-muted-foreground">
              {ticket}
            </span>
          ) : null}
          {prioritized ? (
            <Badge variant="success" size="sm" className="shrink-0">
              Priorizada
            </Badge>
          ) : null}
          {paid ? (
            <Badge variant="success" size="sm" className="shrink-0">
              Pagada
            </Badge>
          ) : null}
        </div>
        {secondary ? (
          <p className="truncate text-xs text-muted-foreground">
            {secondary}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs"
          title={editTitle ?? "Ver comanda"}
          disabled={editDisabled}
          onClick={onEdit}
        >
          <PencilLineIcon data-icon="inline-start" />
          Ver comanda
        </Button>
        {amount ? (
          <span className="text-sm font-semibold tabular-nums">
            {amount}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function PendingOrderItem({
  order,
  canPrintReceipt,
  canCloseOrder,
  busyKey,
  onPrint,
  onCharge,
  onClose,
  onEdit,
}: {
  order: Order
  canPrintReceipt: boolean
  canCloseOrder: boolean
  busyKey: string | null
  onPrint: (orderId: string, key: string) => void
  onCharge: (order: Order) => void
  onClose: (orderId: string, key: string) => void
  onEdit: (orderId: string) => void
}) {
  const money = useMoney()
  const printKey = `print:${order.id}`
  const closeKey = `close:${order.id}`
  const customer =
    order.customerName?.trim() ||
    order.guests?.[0]?.name?.trim() ||
    ""
  const time = timeLabel(order.createdAt)
  const balance = Math.max(Number(order.balance ?? order.total), 0)
  const paid = balance <= 0.004
  const pendingRounds = countPendingDeliveryRounds(order)
  const readyToClose = paid && pendingRounds === 0
  const pendingLabel =
    pendingRounds > 0
      ? `${pendingRounds} ronda${pendingRounds === 1 ? "" : "s"} por entregar`
      : null
  const secondary = [customer, pendingLabel, time]
    .filter(Boolean)
    .join(" | ")

  return (
    <Item className="flex-col items-stretch gap-3 rounded-none border-0 p-0">
      <ItemHeading
        channel={order.channel}
        tableNumber={order.tableNumber}
        ticketNumber={order.ticketNumber}
        paid={paid}
        amount={money(paid ? Number(order.total) : balance)}
        secondary={secondary}
        onEdit={() => onEdit(order.id)}
      />
      <div className="flex w-full flex-col gap-2">
        {canPrintReceipt ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full text-xs"
            disabled={busyKey === printKey}
            onClick={() => onPrint(order.id, printKey)}
          >
            {busyKey === printKey ? (
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
            ) : (
              <PrinterIcon data-icon="inline-start" />
            )}
            Imprimir cuenta
          </Button>
        ) : null}
        {!paid ? (
          <Button
            type="button"
            variant="success"
            className="w-full"
            onClick={() => onCharge(order)}
          >
            <BanknoteIcon data-icon="inline-start" />
            Cobrar cuenta
          </Button>
        ) : pendingRounds > 0 ? (
          <p className="flex items-center justify-center gap-1.5 rounded-md border border-dashed px-3 py-2 text-center text-xs text-muted-foreground">
            <ClockIcon className="size-3.5 shrink-0" />
            Se cerrará al entregar{" "}
            {pendingRounds === 1 ? "la ronda pendiente" : "todas las rondas"}
          </p>
        ) : readyToClose && canCloseOrder ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busyKey !== null}
            onClick={() => onClose(order.id, closeKey)}
          >
            {busyKey === closeKey ? (
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Cerrar cuenta
          </Button>
        ) : null}
      </div>
    </Item>
  )
}

function ReadyRoundItem({
  round,
  busyKey,
  onDeliver,
  onCancel,
  onEdit,
}: {
  round: KitchenRound
  busyKey: string | null
  onDeliver: (round: KitchenRound, key: string) => void
  onCancel: (round: KitchenRound, key: string) => void
  onEdit: (orderId: string) => void
}) {
  const deliverKey = `deliver:${round.id}`
  const cancelKey = `cancel:${round.id}`
  const items = groupServiceItems(round.items)

  return (
    <Item className="flex-col items-stretch gap-3 rounded-none border-0 p-0">
      <ItemHeading
        channel={round.order.channel}
        tableNumber={round.order.tableNumber}
        ticketNumber={round.order.ticketNumber}
        onEdit={() => onEdit(round.order.id)}
        editDisabled={round.order.status !== "OPEN"}
        editTitle={
          round.order.status === "OPEN"
            ? "Ver comanda"
            : "La cuenta ya está pagada"
        }
      />
      <ItemsCollapsible items={items} />
      <div className="flex w-full flex-col gap-2">
        <Button
          type="button"
          variant="destructive"
          className="w-full"
          disabled={busyKey !== null || round.order.status !== "OPEN"}
          title={
            round.order.status === "OPEN"
              ? undefined
              : "La cuenta ya está pagada; no se puede cancelar"
          }
          onClick={() => onCancel(round, cancelKey)}
        >
          {busyKey === cancelKey ? (
            <Loader2Icon data-icon="inline-start" className="animate-spin" />
          ) : (
            <BanIcon data-icon="inline-start" />
          )}
          Cancelar
        </Button>
        <Button
          type="button"
          className="w-full"
          disabled={busyKey !== null}
          onClick={() => onDeliver(round, deliverKey)}
        >
          {busyKey === deliverKey ? (
            <Loader2Icon data-icon="inline-start" className="animate-spin" />
          ) : (
            <CheckIcon data-icon="inline-start" />
          )}
          Entregado
        </Button>
      </div>
    </Item>
  )
}

function KitchenRoundItem({
  round,
  busyKey,
  onPrioritize,
  onEdit,
}: {
  round: KitchenRound
  busyKey: string | null
  onPrioritize: (round: KitchenRound, key: string) => void
  onEdit: (orderId: string) => void
}) {
  const prioritizeKey = `prioritize:${round.id}`
  const items = groupServiceItems(round.items)

  return (
    <Item className="flex-col items-stretch gap-3 rounded-none border-0 p-0">
      <ItemHeading
        channel={round.order.channel}
        tableNumber={round.order.tableNumber}
        ticketNumber={round.order.ticketNumber}
        prioritized={round.prioritized}
        onEdit={() => onEdit(round.order.id)}
        editDisabled={round.order.status !== "OPEN"}
        editTitle={
          round.order.status === "OPEN"
            ? "Ver comanda"
            : "La cuenta ya está pagada"
        }
      />
      <ItemsCollapsible items={items} />
      <div className="flex w-full flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={busyKey !== null || round.prioritized}
          onClick={() => onPrioritize(round, prioritizeKey)}
        >
          {busyKey === prioritizeKey ? (
            <Loader2Icon data-icon="inline-start" className="animate-spin" />
          ) : (
            <ArrowUpIcon data-icon="inline-start" />
          )}
          {round.prioritized ? "Priorizada" : "Priorizar"}
        </Button>
      </div>
    </Item>
  )
}

export function PosServiceQueueSheet({
  open,
  mode,
  onOpenChange,
  rounds,
  orders,
  onPrintOrder,
  onChargeOrder,
  onCloseOrder,
  onDeliverRound,
  onCancelRound,
  onPrioritizeRound,
  onEditOrder,
  canPrintReceipt = false,
  canCloseOrder = false,
  loading = false,
  side = "bottom",
}: {
  open: boolean
  mode: ServiceQueueMode
  onOpenChange: (open: boolean) => void
  rounds: KitchenRound[]
  orders: Order[]
  onPrintOrder: (orderId: string) => Promise<void>
  onChargeOrder: (order: Order) => void
  onCloseOrder: (orderId: string) => Promise<void>
  onDeliverRound: (round: KitchenRound) => Promise<void>
  onCancelRound: (round: KitchenRound) => Promise<void>
  onPrioritizeRound: (round: KitchenRound) => Promise<void>
  onEditOrder: (orderId: string) => void
  canPrintReceipt?: boolean
  canCloseOrder?: boolean
  loading?: boolean
  side?: "bottom" | "right"
}) {
  const [busyKey, setBusyKey] = React.useState<string | null>(null)
  const content = MODE_CONTENT[mode]

  const visibleRounds = rounds
    .filter((round) =>
      mode === "ready"
        ? KITCHEN_READY_STATUSES.includes(round.status)
        : KITCHEN_PROCESS_STATUSES.includes(round.status)
    )
    .sort((left, right) =>
      mode === "kitchen"
        ? Number(right.prioritized) - Number(left.prioritized)
        : 0
    )
  const pending = mode === "pending" ? orders : []
  const count = mode === "pending" ? pending.length : visibleRounds.length

  const run = async (key: string, action: () => Promise<void>) => {
    setBusyKey(key)

    try {
      await action()
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SwipeableSheetContent
        side={side}
        showCloseButton={false}
        onOpenChange={onOpenChange}
        className={
          side === "right"
            ? "h-dvh gap-0 overflow-hidden rounded-none border-l p-0 sm:max-w-md"
            : "max-h-[80dvh] gap-0 overflow-hidden rounded-t-xl border-t p-0"
        }
      >
        <QueueHeader
          count={count}
          title={content.title}
          description={content.description}
        />

        <ScrollArea
          className={
            side === "right"
              ? "max-h-[calc(100dvh-8rem)]"
              : "max-h-[60dvh]"
          }
        >
          <div className="px-4 py-2">
            {count === 0 ? (
              loading && mode !== "pending" ? (
                <p className="my-4 flex items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  <Loader2Icon className="size-4 animate-spin" />
                  Cargando rondas…
                </p>
              ) : (
                <p className="my-4 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {content.empty}
                </p>
              )
            ) : (
              <ItemGroup className="gap-0">
                {mode === "pending"
                  ? pending.map((order, index) => (
                      <React.Fragment key={order.id}>
                        {index > 0 ? <ItemSeparator /> : null}
                        <PendingOrderItem
                          order={order}
                          canPrintReceipt={canPrintReceipt}
                          canCloseOrder={canCloseOrder}
                          busyKey={busyKey}
                          onPrint={(orderId, key) =>
                            void run(key, () => onPrintOrder(orderId))
                          }
                          onCharge={onChargeOrder}
                          onClose={(orderId, key) =>
                            void run(key, () => onCloseOrder(orderId))
                          }
                          onEdit={onEditOrder}
                        />
                      </React.Fragment>
                    ))
                  : visibleRounds.map((round, index) => (
                      <React.Fragment key={round.id}>
                        {index > 0 ? <ItemSeparator /> : null}
                        {mode === "ready" ? (
                          <ReadyRoundItem
                            round={round}
                            busyKey={busyKey}
                            onDeliver={(entry, key) =>
                              void run(key, () => onDeliverRound(entry))
                            }
                            onCancel={(entry, key) =>
                              void run(key, () => onCancelRound(entry))
                            }
                            onEdit={onEditOrder}
                          />
                        ) : (
                          <KitchenRoundItem
                            round={round}
                            busyKey={busyKey}
                            onPrioritize={(entry, key) =>
                              void run(key, () => onPrioritizeRound(entry))
                            }
                            onEdit={onEditOrder}
                          />
                        )}
                      </React.Fragment>
                    ))}
              </ItemGroup>
            )}
          </div>
        </ScrollArea>
      </SwipeableSheetContent>
    </Sheet>
  )
}
