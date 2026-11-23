import { TriangleAlertIcon } from "lucide-react"

import { SuppliersClient } from "@/components/suppliers/suppliers-client"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { apiFetch } from "@/lib/api"
import { canManagePurchases, type Supplier } from "@/lib/purchases"
import type { Ingredient } from "@/lib/catalog"
import { requireAnyRole } from "@/lib/session"

export default async function SuppliersPage() {
  const user = await requireAnyRole([
    "ADMIN",
    "SUPERVISOR",
    "INVENTORY_MANAGER",
  ])

  const [suppliersResponse, ingredientsResponse] = await Promise.all([
    apiFetch("/suppliers?includeInactive=true"),
    apiFetch("/inventory/ingredients"),
  ])

  if (!suppliersResponse.ok) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <Card className="max-w-md text-center">
          <CardHeader className="items-center">
            <TriangleAlertIcon className="size-6 text-destructive" />
            <CardTitle>No se pudieron cargar los proveedores</CardTitle>
            <CardDescription>
              La API no respondió correctamente. Comprueba que esté en marcha e
              inténtalo de nuevo.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const suppliers = (await suppliersResponse.json()) as Supplier[]
  const ingredients = ingredientsResponse.ok
    ? ((await ingredientsResponse.json()) as Ingredient[])
    : []

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <SuppliersClient
        suppliers={suppliers}
        ingredients={ingredients.filter((ingredient) => ingredient.isActive)}
        canManage={canManagePurchases(user.roles)}
      />
    </div>
  )
}
