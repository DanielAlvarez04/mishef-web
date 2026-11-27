"use client"

import {
  ArmchairIcon,
  CarIcon,
  StoreIcon,
  TruckIcon,
} from "lucide-react"

import type { OrderChannel } from "@/lib/orders"

/** Icono estable por canal de venta, sin crear componentes en render. */
export function PosChannelIcon({
  channel,
  className,
}: {
  channel?: OrderChannel | null
  className?: string
}) {
  switch (channel) {
    case "COUNTER":
      return <StoreIcon className={className} />
    case "PHONE":
      return <CarIcon className={className} />
    case "DELIVERY":
      return <TruckIcon className={className} />
    default:
      return <ArmchairIcon className={className} />
  }
}
