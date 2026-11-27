"use client"

import * as React from "react"
import {
  BanknoteXIcon,
  ChefHatIcon,
  ChevronRightIcon,
  ConciergeBellIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useMoney } from "@/lib/currency"
import {
  ORDER_CHANNEL_LABELS,
  ROUND_STATUS_LABELS,
  ticketCode,
  type KitchenRound,
  type Order,
} from "@/lib/orders"
import {
  KITCHEN_PROCESS_STATUSES,
  KITCHEN_READY_STATUSES,
  pendingPaymentOrders,
} from "@/lib/pos-service"

export type ServiceQueueMode = "kitchen" | "ready" | "pending"

const MODE_CONTENT: Record<
  ServiceQueueMode,
  {
    title: string
    description: string
    empty: string
    icon: typeof ChefHatIcon
  }
> = {
  kitchen: {
    title: "Pedidos en cocina",
    description: "Rondas que cocina todavía está preparando o por empezar.",
    empty: "No hay pedidos en cocina.",
    icon: ChefHatIcon,
  },
  ready: {
    title: "Pedidos listos",
    description: "Rondas listas para llevar a la mesa del comensal.",
    empty: "No hay pedidos listos para entregar.",
    icon: ConciergeBellIcon,
  },
  pending: {
    title: "Cuentas por cobrar",
    description: "Cuentas abiertas con saldo pendiente de cobro.",
    empty: "No hay cuentas pendientes de cobro.",
    icon: BanknoteXIcon,
  },
}

function orderHeadline(order: KitchenRound["order"] | Order) {
  if (order.tableNumber) return `Mesa ${order.tableNumber}`
  if (order.channel === "COUNTER") {
    return order.customerName?.trim() || "Mostrador"
  }
  if (order.channel === "PHONE") {
    return order.customerName?.trim() || "Drive-Thru"
  }
  if (order.channel === "DELIVERY") return "Domicilio"
  return order.customerName?.trim() || "Pedido"
}

function minutesLabel(minutes: number) {
  if (minutes < 1) return "ahora"
  if (minutes === 1) return "hace 1 min"
  return `hace ${minutes} min`
}

function itemsSummary(round: KitchenRound) {
  const visible = round.items.slice(0, 3).map(
    (item) => `${item.quantity}× ${item.itemName}`
  )
  const hidden = round.items.length - visible.length

  return `${visible.join(" · ")}${hidden > 0 ? ` · +${hidden} más` : ""}`
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

function activateOnKey(
  event: React.KeyboardEvent<HTMLDivElement>,
  action: () => void
) {
  if (event.key !== "Enter" && event.key !== " ") return

  event.preventDefault()
  action()
}

export function PosServiceQueueSheet({
  open,
  mode,
  onOpenChange,
  rounds,
  orders,
  onOpenOrder,
}: {
  open: boolean
  mode: ServiceQueueMode
  onOpenChange: (open: boolean) => void
  rounds: KitchenRound[]
  orders: Order[]
  onOpenOrder: (orderId: string) => void
}) {
  const money = useMoney()
  const content = MODE_CONTENT[mode]
  const Icon = content.icon

  const kitchenRounds = rounds.filter((round) =>
    mode === "ready"
      ? KITCHEN_READY_STATUSES.includes(round.status)
      : KITCHEN_PROCESS_STATUSES.includes(round.status)
  )
  const pending = mode === "pending" ? pendingPaymentOrders(orders) : []
  const count = mode === "pending" ? pending.length : kitchenRounds.length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[80dvh] gap-0 overflow-hidden rounded-t-xl border-t p-0"
      >
        <SheetHeader className="border-b">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon className="size-4" />
            </span>
            <div className="flex min-w-0 flex-col">
              <SheetTitle>{content.title}</SheetTitle>
              <SheetDescription>{content.description}</SheetDescription>
            </div>
            {count > 0 ? (
              <Badge variant="secondary" className="ml-auto tabular-nums">
                {count}
              </Badge>
            ) : null}
          </div>
        </SheetHeader>

        <ScrollArea className="max-h-[60dvh]">
          <div className="p-4">
            {count === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                {content.empty}
              </p>
            ) : mode === "pending" ? (
              <ItemGroup>
                {pending.map((order) => (
                  <Item
                    key={order.id}
                    variant="outline"
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onOpenOrder(order.id)}
                    onKeyDown={(event) =>
                      activateOnKey(event, () => onOpenOrder(order.id))
                    }
                  >
                    <ItemMedia variant="icon">
                      <BanknoteXIcon />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>
                        {orderHeadline(order)}
                        {ticketCode(order.ticketNumber) ? (
                          <span className="text-xs font-normal text-muted-foreground">
                            {ticketCode(order.ticketNumber)}
                          </span>
                        ) : null}
                      </ItemTitle>
                      <ItemDescription>
                        {ORDER_CHANNEL_LABELS[order.channel ?? "DINE_IN"]}
                        {order.partySize > 1
                          ? ` · ${order.partySize} clientes`
                          : ""}
                        {order.createdAt
                          ? ` · ${timeLabel(order.createdAt)}`
                          : ""}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <span className="text-sm font-semibold tabular-nums">
                        {money(
                          Math.max(Number(order.balance ?? order.total), 0)
                        )}
                      </span>
                      <ChevronRightIcon className="size-4 text-muted-foreground" />
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
            ) : (
              <ItemGroup>
                {kitchenRounds.map((round) => {
                  const canOpen = round.order.status === "OPEN"

                  return (
                    <Item
                      key={round.id}
                      variant="outline"
                      role={canOpen ? "button" : undefined}
                      tabIndex={canOpen ? 0 : undefined}
                      className={canOpen ? "cursor-pointer hover:bg-muted/50" : undefined}
                      onClick={
                        canOpen ? () => onOpenOrder(round.order.id) : undefined
                      }
                      onKeyDown={
                        canOpen
                          ? (event) =>
                              activateOnKey(event, () =>
                                onOpenOrder(round.order.id)
                              )
                          : undefined
                      }
                    >
                      <ItemMedia variant="icon">
                        {mode === "ready" ? (
                          <ConciergeBellIcon />
                        ) : (
                          <ChefHatIcon />
                        )}
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>
                          {orderHeadline(round.order)}
                          {ticketCode(round.order.ticketNumber) ? (
                            <span className="text-xs font-normal text-muted-foreground">
                              {ticketCode(round.order.ticketNumber)}
                            </span>
                          ) : null}
                        </ItemTitle>
                        <ItemDescription>
                          {ROUND_STATUS_LABELS[round.status]} ·{" "}
                          {round.itemCount} art. ·{" "}
                          {minutesLabel(round.waitMinutes)}
                        </ItemDescription>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {itemsSummary(round)}
                        </p>
                      </ItemContent>
                      <ItemActions>
                        {round.order.status === "CLOSED" ? (
                          <Badge variant="outline">Pagada</Badge>
                        ) : (
                          <Badge variant="secondary">
                            {ROUND_STATUS_LABELS[round.status]}
                          </Badge>
                        )}
                        {canOpen ? (
                          <ChevronRightIcon className="size-4 text-muted-foreground" />
                        ) : null}
                      </ItemActions>
                    </Item>
                  )
                })}
              </ItemGroup>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
