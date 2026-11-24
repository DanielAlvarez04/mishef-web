import { redirect } from "next/navigation"

import { ReceiptsEditor } from "@/components/platform/receipts-editor"
import { Card, CardContent } from "@/components/ui/card"
import { apiFetch } from "@/lib/api"
import type { PlatformReceiptsData } from "@/lib/receipts"
import { requireUser } from "@/lib/session"

export default async function PlatformReceiptsPage() {
  const user = await requireUser()

  if (!user.isPlatformAdmin) redirect("/dashboard")

  const response = await apiFetch("/platform/receipts")
  let data: PlatformReceiptsData | null = null

  if (response.ok) {
    const text = await response.text()
    data = text.trim() ? (JSON.parse(text) as PlatformReceiptsData) : null
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Tickets de la terminal
        </h1>
        <p className="text-sm text-muted-foreground">
          Plantilla por sucursal para la impresión en terminales Point Smart.
          El logo se imprime como una imagen separada antes del ticket.
        </p>
      </div>

      {!data ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No pudimos cargar los negocios. Recarga la página e inténtalo de
            nuevo.
          </CardContent>
        </Card>
      ) : (
        <ReceiptsEditor data={data} canManageGlobal />
      )}
    </div>
  )
}
