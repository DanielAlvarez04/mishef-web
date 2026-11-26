import { TriangleAlertIcon } from "lucide-react"

import { AdvancedKitchenView } from "@/components/kitchen/advanced-kitchen-view"
import { KitchenView } from "@/components/kitchen/kitchen-view"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { apiFetch } from "@/lib/api"
import { getActiveBranch } from "@/lib/branch-server"
import type { KitchenBoard } from "@/lib/kitchen-tickets"
import { canWorkKitchen, type KitchenRound } from "@/lib/orders"
import { requireAnyRole } from "@/lib/session"

export default async function KitchenPage() {
  const user = await requireAnyRole(["ADMIN", "WAITER", "KITCHEN"])

  const [response, branch, settingsResponse, ticketsResponse] =
    await Promise.all([
      apiFetch("/kitchen/rounds"),
      getActiveBranch(),
      apiFetch("/kitchen/settings"),
      apiFetch("/kitchen/tickets"),
    ])

  const board: KitchenBoard | null = ticketsResponse.ok
    ? ((await ticketsResponse.json()) as KitchenBoard)
    : null

  if (board?.mode === "ADVANCED") {
    return (
      <div className="flex flex-1 flex-col p-4">
        <AdvancedKitchenView
          board={board}
          roles={user.roles}
          serverNow={new Date().toISOString()}
        />
      </div>
    )
  }

  if (!response.ok) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <Card className="max-w-md text-center">
          <CardHeader className="items-center">
            <TriangleAlertIcon className="size-6 text-destructive" />
            <CardTitle>No se pudo cargar la cocina</CardTitle>
            <CardDescription>
              La API no respondió correctamente. Comprueba que está en marcha e
              inténtalo de nuevo.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const rounds = (await response.json()) as KitchenRound[]
  const settings = settingsResponse.ok
    ? ((await settingsResponse.json()) as { suggestOrder?: boolean })
    : null

  return (
    <KitchenView
      rounds={rounds}
      canWork={canWorkKitchen(user.roles)}
      branch={branch}
      suggestedByDefault={settings?.suggestOrder ?? true}
      serverNow={new Date().toISOString()}
    />
  )
}
