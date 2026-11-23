import { TriangleAlertIcon } from "lucide-react"

import { CatalogAiClient } from "@/components/catalog/catalog-ai-client"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { apiFetch } from "@/lib/api"
import type { Category, ItemListItem } from "@/lib/catalog"
import type { CatalogProposal } from "@/lib/forecast"
import { requireAnyRole } from "@/lib/session"

export default async function CatalogAiPage() {
  await requireAnyRole(["ADMIN", "INVENTORY_MANAGER"])

  const [itemsResponse, categoriesResponse, proposalsResponse] =
    await Promise.all([
      apiFetch("/catalog/items?includeInactive=true&includeArchived=false"),
      apiFetch("/catalog/categories?kind=article"),
      apiFetch("/intel/catalog/proposals"),
    ])

  if (!itemsResponse.ok) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <Card className="max-w-md text-center">
          <CardHeader className="items-center">
            <TriangleAlertIcon className="size-6 text-destructive" />
            <CardTitle>No se pudo cargar el catálogo</CardTitle>
            <CardDescription>
              La API no respondió correctamente. Comprueba que esté en marcha e
              inténtalo de nuevo.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const items = (await itemsResponse.json()) as ItemListItem[]
  const categories = categoriesResponse.ok
    ? ((await categoriesResponse.json()) as Category[])
    : []
  const proposals = proposalsResponse.ok
    ? ((await proposalsResponse.json()) as CatalogProposal[])
    : []

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <CatalogAiClient
        items={items.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          category: item.category,
        }))}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))}
        initialProposals={proposals}
      />
    </div>
  )
}
