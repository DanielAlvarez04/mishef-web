import { ClipboardCheckIcon, ReceiptTextIcon, TriangleAlertIcon } from "lucide-react"

import { PurchasesList } from "@/components/purchases/purchases-list"
import { TicketCapture } from "@/components/purchases/ticket-capture"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { apiFetch } from "@/lib/api"
import {
  canManagePurchases,
  type PurchaseListItem,
  type Supplier,
} from "@/lib/purchases"
import { requireAnyRole } from "@/lib/session"

export default async function PurchasesPage() {
  const user = await requireAnyRole([
    "ADMIN",
    "SUPERVISOR",
    "INVENTORY_MANAGER",
  ])

  const [purchasesResponse, suppliersResponse] = await Promise.all([
    apiFetch("/purchases"),
    apiFetch("/suppliers"),
  ])

  if (!purchasesResponse.ok) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <Card className="max-w-md text-center">
          <CardHeader className="items-center">
            <TriangleAlertIcon className="size-6 text-destructive" />
            <CardTitle>No se pudieron cargar las compras</CardTitle>
            <CardDescription>
              La API no respondió correctamente. Comprueba que esté en marcha e
              inténtalo de nuevo.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const purchases = (await purchasesResponse.json()) as PurchaseListItem[]
  const suppliers = suppliersResponse.ok
    ? ((await suppliersResponse.json()) as Supplier[])
    : []

  const pending = purchases.filter((item) => item.status === "NEEDS_REVIEW")
  const failed = purchases.filter((item) => item.status === "FAILED")
  const approvedTotal = purchases
    .filter((item) => item.status === "APPROVED")
    .reduce((sum, item) => sum + Number(item.total), 0)

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Compras</h1>
        <p className="text-sm text-muted-foreground">
          Sube el ticket, revisa lo que leyó la IA y aprueba para entrar el
          inventario con su costo real.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Por revisar</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {pending.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Compras aprobadas</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              ${approvedTotal.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Proveedores activos</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {suppliers.filter((supplier) => supplier.isActive).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Sin leer</CardDescription>
            <CardTitle className="text-2xl tabular-nums text-destructive">
              {failed.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {canManagePurchases(user.roles) ? <TicketCapture /> : null}

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ReceiptTextIcon className="size-4" />
        <span>
          {pending.length > 0
            ? `${pending.length} ticket(s) esperan tu revisión.`
            : "No hay tickets pendientes de revisión."}
        </span>
        {pending.length > 0 ? (
          <ClipboardCheckIcon className="ml-auto size-4" />
        ) : null}
      </div>

      <PurchasesList purchases={purchases} />
    </div>
  )
}
