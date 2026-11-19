"use client"

import { useEffect, type ReactNode } from "react"
import {
  Building2Icon,
  ChefHatIcon,
  CookingPotIcon,
  CreditCardIcon,
  PackageIcon,
  PaletteIcon,
  UserIcon,
} from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePersistentTab } from "@/hooks/use-persistent-tab"

const SETTINGS_TABS = [
  "account",
  "business",
  "payments",
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
  catalog,
  kitchen,
  inventory,
  personalization,
  initialTab,
}: {
  account: ReactNode
  business: ReactNode
  payments: ReactNode
  catalog: ReactNode
  kitchen: ReactNode
  inventory: ReactNode
  personalization: ReactNode
  /** Pestaña que debe abrirse al entrar (p. ej. al volver de Mercado Pago). */
  initialTab?: (typeof SETTINGS_TABS)[number]
}) {
  const [tab, setTab] = usePersistentTab(
    "settings-tab",
    SETTINGS_TABS,
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
        <TabsTrigger value="business">
          <Building2Icon className="size-4" />
          Negocio
        </TabsTrigger>
        <TabsTrigger value="payments">
          <CreditCardIcon className="size-4" />
          Pagos
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
