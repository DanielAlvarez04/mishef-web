import Link from "next/link"
import { notFound } from "next/navigation"
import { TriangleAlertIcon } from "lucide-react"

import { PurchaseReview } from "@/components/purchases/purchase-review"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { apiFetch } from "@/lib/api"
import {
  canManagePurchases,
  type PurchaseDetail,
  type Supplier,
} from "@/lib/purchases"
import type { Ingredient } from "@/lib/catalog"
import { requireAnyRole } from "@/lib/session"

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireAnyRole([
    "ADMIN",
    "SUPERVISOR",
    "INVENTORY_MANAGER",
  ])

  const [purchaseResponse, suppliersResponse, ingredientsResponse] =
    await Promise.all([
      apiFetch(`/purchases/${id}`),
      apiFetch("/suppliers"),
      apiFetch("/inventory/ingredients"),
    ])

  if (purchaseResponse.status === 404) notFound()

  if (!purchaseResponse.ok) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <Card className="max-w-md text-center">
          <CardHeader className="items-center">
            <TriangleAlertIcon className="size-6 text-destructive" />
            <CardTitle>No se pudo cargar el ticket</CardTitle>
            <CardDescription>
              La API no respondió correctamente. Vuelve a intentarlo.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const purchase = (await purchaseResponse.json()) as PurchaseDetail
  const suppliers = suppliersResponse.ok
    ? ((await suppliersResponse.json()) as Supplier[])
    : []
  const ingredients = ingredientsResponse.ok
    ? ((await ingredientsResponse.json()) as Ingredient[])
    : []

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/purchases" />}>
          ← Compras
        </Button>
      </div>

      <PurchaseReview
        purchase={purchase}
        suppliers={suppliers.filter((supplier) => supplier.isActive)}
        ingredients={ingredients.filter((ingredient) => ingredient.isActive)}
        canManage={canManagePurchases(user.roles)}
      />
    </div>
  )
}
