"use server"

import { mutateApi, readApi, type ActionResult } from "@/lib/server-api"
import type { OrderSplit, SplitMode } from "@/lib/orders"

const SPLIT_PATHS: string[] = []

export interface CreateOrderSplitInput {
  mode: SplitMode
  parts?: number
  amounts?: Array<{
    label?: string
    guestId?: string
    amount: number
  }>
}

export async function getOrderSplits(
  orderId: string
): Promise<ActionResult<OrderSplit[]>> {
  return readApi<OrderSplit[]>(`/orders/${orderId}/splits`)
}

export async function createOrderSplits(
  orderId: string,
  input: CreateOrderSplitInput
): Promise<ActionResult<OrderSplit[]>> {
  return mutateApi<OrderSplit[]>(
    `/orders/${orderId}/splits`,
    "POST",
    input,
    SPLIT_PATHS
  )
}

/** Reemplaza la división activa en una sola petición (sin pagos). */
export async function replaceOrderSplits(
  orderId: string,
  input: CreateOrderSplitInput
): Promise<ActionResult<OrderSplit[]>> {
  return mutateApi<OrderSplit[]>(
    `/orders/${orderId}/splits`,
    "PUT",
    input,
    SPLIT_PATHS
  )
}

export async function cancelOrderSplits(
  orderId: string
): Promise<ActionResult> {
  return mutateApi(
    `/orders/${orderId}/splits`,
    "DELETE",
    undefined,
    SPLIT_PATHS
  )
}
