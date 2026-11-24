"use client"

import { useEffect, type ReactNode } from "react"
import {
  Building2Icon,
  ChefHatIcon,
  CookingPotIcon,
  CreditCardIcon,
  PackageIcon,
  PaletteIcon,
  ReceiptTextIcon,
  UserIcon,
} from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePersistentTab } from "@/hooks/use-persistent-tab"

const SETTINGS_TABS = [
  "account",
  "business",
  "payments",
  "ticket",
  "catalog",
  "kitchen",
  "inventory",
  "personalization",
] as const

/**
 * Pestañas laterales de Configuración.
 *
 * Es un componente de cliente porque las tabs usan Base UI; el contenido se
 * renderiza en el servidor y llega como props.
 */
export function SettingsTabs({
  account,
  business,
  payments,
  ticket,
  catalog,
  kitchen,
  inventory,
  personalization,
  initialTab,
  canManage = false,
}: {
  account: ReactNode
  business: ReactNode
  payments: ReactNode
  ticket: ReactNode
  catalog: ReactNode
  kitchen: ReactNode
  inventory: ReactNode
  personalization: ReactNode
  /** Pestaña que debe abrirse al entrar (p. ej. al volver de Mercado Pago). */
  initialTab?: (typeof SETTINGS_TABS)[number]
  /** Solo el ADMIN ve las pestañas de negocio; el resto ve su cuenta. */
  canManage?: boolean
}) {
  const visibleTabs = canManage
    ? SETTINGS_TABS
    : (["account"] as const)

  const [tab, setTab] = usePersistentTab(
    "settings-tab",
    visibleTabs,
    "account"
  )

  useEffect(() => {
    if (initialTab) setTab(initialTab)
  }, [initialTab, setTab])

  return (
    <Tabs
      value={tab}
      onValueChange={setTab}
      className="gap-4"
    >
      <TabsList
        aria-label="Secciones de configuración"
        className="max-w-full"
      >
        <TabsTrigger value="account">
          <UserIcon className="size-4" />
          Cuenta
        </TabsTrigger>
        {canManage ? (
          <>
            <TabsTrigger value="business">
              <Building2Icon className="size-4" />
              Negocio
            </TabsTrigger>
            <TabsTrigger value="payments">
              <CreditCardIcon className="size-4" />
              Pagos
            </TabsTrigger>
            <TabsTrigger value="ticket">
              <ReceiptTextIcon className="size-4" />
              Ticket
            </TabsTrigger>
            <TabsTrigger value="catalog">
              <CookingPotIcon className="size-4" />
              Catálogo
            </TabsTrigger>
            <TabsTrigger value="kitchen">
              <ChefHatIcon className="size-4" />
              Cocina
            </TabsTrigger>
            <TabsTrigger value="inventory">
              <PackageIcon className="size-4" />
              Inventario
            </TabsTrigger>
            <TabsTrigger value="personalization">
              <PaletteIcon className="size-4" />
              Personalización
            </TabsTrigger>
          </>
        ) : null}
      </TabsList>

      <TabsContent value="account" className="flex min-w-0 flex-col gap-6">
        {account}
      </TabsContent>
      <TabsContent value="business" className="flex min-w-0 flex-col gap-6">
        {business}
      </TabsContent>
      <TabsContent value="payments" className="flex min-w-0 flex-col gap-6">
        {payments}
      </TabsContent>
      <TabsContent value="ticket" className="flex min-w-0 flex-col gap-6">
        {ticket}
      </TabsContent>
      <TabsContent
        value="catalog"
        keepMounted
        className="flex min-w-0 flex-col gap-6"
      >
        {catalog}
      </TabsContent>
      <TabsContent
        value="kitchen"
        className="flex min-w-0 flex-col gap-6"
      >
        {kitchen}
      </TabsContent>
      <TabsContent
        value="inventory"
        // Mantiene la selección de insumos al cambiar de pestaña.
        keepMounted
        className="flex min-w-0 flex-col gap-6"
      >
        {inventory}
      </TabsContent>
      <TabsContent
        value="personalization"
        className="flex min-w-0 flex-col gap-6"
      >
        {personalization}
      </TabsContent>
    </Tabs>
  )
}
