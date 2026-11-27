import { PosView } from "@/components/pos/pos-view"
import { PosOfflineFallback } from "@/components/pos/pos-offline-fallback"
import { OfflineSnapshot } from "@/components/offline/offline-snapshot"
import { setActiveBranch } from "@/app/(app)/branch-actions"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import { getActiveBranch, getBranches } from "@/lib/branch-server"
import type { Category, ItemListItem } from "@/lib/catalog"
import type { Menu, MenuTrendingPayload } from "@/lib/menus"
import {
  canConfirmPayments,
  canDraftOrders,
  canManageCash,
  canRegisterPayments,
  canSendOrders,
  type KitchenRound,
  type Order,
} from "@/lib/orders"
import type { CashSessionPayload } from "@/lib/cash"
import type { DiningTable } from "@/lib/tables"
import type { PosDisplayInfo } from "@/lib/pos-display"
import type { MercadoPagoPointConfig } from "@/lib/mercadopago"
import { requireAnyRole } from "@/lib/session"
import { redirect } from "next/navigation"

/** Guarda la sucursal elegida y recarga el POS ya contextualizado. */
async function chooseBranch(formData: FormData) {
  "use server"

  const branchId = String(formData.get("branchId") ?? "")
  const result = await setActiveBranch(branchId || null)

  if (!result.ok) return

  redirect("/pos")
}

export default async function PointOfSalePage() {
  const user = await requireAnyRole(["ADMIN", "WAITER", "CASHIER"])
  const canRegister = canRegisterPayments(user.roles)

  const [
    productsResponse,
    categoriesResponse,
    ordersResponse,
    menusResponse,
    branch,
    cashResponse,
    displaysResponse,
    pointConfigResponse,
    trendingResponse,
    kitchenModeResponse,
    tablesResponse,
    kitchenRoundsResponse,
    draftsResponse,
  ] = await Promise.all([
    apiFetch("/catalog/items"),
    apiFetch("/catalog/categories"),
    apiFetch("/orders?status=OPEN"),
    apiFetch("/catalog/menus"),
    getActiveBranch(),
    apiFetch("/cash/sessions/current"),
    apiFetch("/pos/displays"),
    canRegister
      ? apiFetch("/mercadopago/point-config")
      : Promise.resolve(null),
    apiFetch("/catalog/menus/trending"),
    apiFetch("/kitchen/mode"),
    apiFetch("/tables"),
    apiFetch("/kitchen/rounds"),
    apiFetch("/pos/drafts"),
  ])

  // Primero el modo offline: si la red falló, no se puede saber si falta
  // sucursal y el POS debe seguir funcionando con el snapshot local.
  if (
    !productsResponse.ok ||
    !categoriesResponse.ok ||
    !ordersResponse.ok ||
    !menusResponse.ok
  ) {
    return (
      <PosOfflineFallback
        organizationId={user.organizationId ?? ""}
        branchId={branch?.id ?? null}
      />
    )
  }

  // Vender sin sucursal deja la cuenta sin folio ni nombre de sucursal en el
  // ticket. Si hay varias, se exige elegir una antes de abrir cuentas.
  if (!branch) {
    const branches = await getBranches()
    const active = branches.filter((entry) => entry.isActive)

    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
          <h1 className="text-lg font-semibold">Selecciona una sucursal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Para abrir cuentas necesitas elegir la sucursal donde estás
            operando.
          </p>

          {active.length > 0 ? (
            <div className="mt-4 flex flex-col gap-2">
              {active.map((entry) => (
                <form key={entry.id} action={chooseBranch}>
                  <input type="hidden" name="branchId" value={entry.id} />
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full justify-start"
                  >
                    {entry.name}
                  </Button>
                </form>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-destructive">
              No hay sucursales activas. Crea una en Configuración → Negocio.
            </p>
          )}
        </div>
      </div>
    )
  }

  const [products, categories, orders, menus, trending] = await Promise.all([
    productsResponse.json() as Promise<ItemListItem[]>,
    categoriesResponse.json() as Promise<Category[]>,
    ordersResponse.json() as Promise<Order[]>,
    menusResponse.json() as Promise<Menu[]>,
    trendingResponse.ok
      ? (trendingResponse.json() as Promise<MenuTrendingPayload>)
      : Promise.resolve({ days: 30, items: [] } as MenuTrendingPayload),
  ])

  const pointConfigRaw: MercadoPagoPointConfig = pointConfigResponse?.ok
    ? ((await pointConfigResponse.json()) as MercadoPagoPointConfig)
    : { enabled: false, linkEnabled: false, minAmount: 5, terminals: [] }

  const pointTerminals = pointConfigRaw.terminals.filter(
    (terminal) =>
      !terminal.branchId || !branch || terminal.branchId === branch.id
  )
  const pointConfig: MercadoPagoPointConfig = {
    enabled: pointConfigRaw.enabled && pointTerminals.length > 0,
    linkEnabled: pointConfigRaw.linkEnabled,
    minAmount: pointConfigRaw.minAmount ?? 5,
    terminals: pointTerminals,
  }

  const cash: CashSessionPayload = cashResponse.ok
    ? ((await cashResponse.json()) as CashSessionPayload)
    : { session: null, summary: null }

  const displays: PosDisplayInfo[] = displaysResponse.ok
    ? ((await displaysResponse.json()) as PosDisplayInfo[])
    : []

  const kitchenMode = kitchenModeResponse.ok
    ? ((await kitchenModeResponse.json()) as { mode?: string }).mode
    : "GENERAL"
  const diningTables = tablesResponse.ok
    ? ((await tablesResponse.json()) as DiningTable[])
    : []
  const initialServiceRounds: KitchenRound[] = kitchenRoundsResponse.ok
    ? ((await kitchenRoundsResponse.json()) as KitchenRound[])
    : []
  const initialDraftCount = draftsResponse.ok
    ? ((await draftsResponse.json()) as unknown[]).length
    : 0

  return (
    <>
      <OfflineSnapshot
        organizationId={user.organizationId ?? ""}
        branchId={branch?.id ?? null}
        items={products}
        categories={categories}
        menus={menus}
        cashSession={cash}
      />
      <PosView
      products={products}
      orders={orders}
      menus={menus}
      trendingItems={trending.items}
      canDraft={canDraftOrders(user.roles)}
      canSend={canSendOrders(user.roles)}
      canRegister={canRegister}
      canConfirm={canConfirmPayments(user.roles)}
      mercadoPago={pointConfig}
      cash={cash}
      canManageCash={canManageCash(user.roles)}
      displays={displays}
        taxRate={user.organizationTaxRate ?? "0.16"}
        kitchenAdvanced={kitchenMode === "ADVANCED"}
        diningTables={diningTables}
        initialServiceRounds={initialServiceRounds}
        initialDraftCount={initialDraftCount}
      />
    </>
  )
}
