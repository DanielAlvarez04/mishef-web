import {
  CircleCheckIcon,
  CircleXIcon,
  FlameIcon,
  HandPlatterIcon,
  TimerIcon,
  type LucideIcon,
} from "lucide-react"

import type { RoundStatus } from "@/lib/orders"

/** Icono homologado para cada estado de comanda. */
const STATUS_ICONS: Record<RoundStatus, LucideIcon> = {
  PENDING: TimerIcon,
  HELD: TimerIcon,
  FIRED: FlameIcon,
  PREPARING: FlameIcon,
  READY: HandPlatterIcon,
  PICKED_UP: HandPlatterIcon,
  DELIVERED: CircleCheckIcon,
  CANCELLED: CircleXIcon,
}

export function OrderStatusIcon({
  status,
  className,
}: {
  status: RoundStatus
  className?: string
}) {
  const Icon = STATUS_ICONS[status]

  return <Icon className={className} data-icon="inline-start" />
}
