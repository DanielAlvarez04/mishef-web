import { redirect } from "next/navigation"

import { WasteForm } from "@/components/waste/waste-form"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { apiFetch } from "@/lib/api"
import type { WasteIngredient, WasteList } from "@/lib/waste"
import { canManageInventory } from "@/lib/catalog"
import { requireUser } from "@/lib/session"

export default async function WastePage() {
  const user = await requireUser()

  if (!canManageInventory(user.roles)) {
    redirect("/inventory")
  }

  // Server component: el rango depende del reloj del servidor.
  // eslint-disable-next-line react-hooks/purity
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
  const to = new Date().toISOString().slice(0, 10)

  const [ingredientsResponse, listResponse] = await Promise.all([
    apiFetch("/inventory/ingredients"),
    apiFetch(`/waste?from=${from}&to=${to}`),
  ])

  const ingredients = ingredientsResponse.ok
    ? ((await ingredientsResponse.json()) as WasteIngredient[])
    : []
  const list = listResponse.ok
    ? ((await listResponse.json()) as WasteList)
    : null

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Merma</h1>
        <p className="text-sm text-muted-foreground">
          Registra lo que se pierde con su costo y una foto como evidencia.
        </p>
      </div>

      <WasteForm ingredients={ingredients} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Costo de merma (30 días)</CardDescription>
            <CardTitle className="text-2xl tabular-nums text-destructive">
              ${(list?.total ?? 0).toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
        {(list?.byReason ?? []).map((row) => (
          <Card key={row.reason}>
            <CardHeader>
              <CardDescription>{labelFor(row.reason)}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                ${row.cost.toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Insumo</th>
              <th className="px-4 py-2 text-right font-medium">Cantidad</th>
              <th className="px-4 py-2 font-medium">Motivo</th>
              <th className="px-4 py-2 text-right font-medium">Costo</th>
              <th className="px-4 py-2 font-medium">Quién</th>
              <th className="px-4 py-2 font-medium">Foto</th>
            </tr>
          </thead>
          <tbody>
            {(list?.items ?? []).map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-2 font-medium">{item.ingredientName}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {Number(item.quantity).toFixed(2)} {item.displayUnit}
                </td>
                <td className="px-4 py-2">{labelFor(item.reason)}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  ${item.cost.toFixed(2)}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {item.user?.name ?? item.user?.username ?? "—"}
                </td>
                <td className="px-4 py-2">
                  {item.photoUrl ? (
                    <a
                      href={item.photoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-4"
                    >
                      Ver
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {(list?.items ?? []).length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Sin mermas registradas en los últimos 30 días.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function labelFor(reason: string) {
  switch (reason) {
    case "EXPIRED":
      return "Caducó"
    case "DAMAGED":
      return "Dañado"
    case "SPILL":
      return "Derrame"
    case "OVERPRODUCTION":
      return "Sobró producción"
    default:
      return "Otro"
  }
}
