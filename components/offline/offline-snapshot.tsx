"use client"

import { useEffect } from "react"

import { POS_CACHE_SCOPES, tenantCacheKey } from "@/lib/offline/cache-keys"
import { putCache } from "@/lib/offline/db"

/**
 * Guarda en IndexedDB la última copia buena de los datos del POS.
 *
 * Las claves incluyen organización y sucursal: dos negocios en el mismo
 * dispositivo nunca comparten catálogo, menús ni turno de caja.
 */
export function OfflineSnapshot({
  organizationId,
  branchId,
  items,
  categories,
  menus,
  cashSession,
}: {
  organizationId: string
  branchId: string | null
  items: unknown
  categories: unknown
  menus: unknown
  cashSession: unknown
}) {
  useEffect(() => {
    const key = (scope: string) =>
      tenantCacheKey(scope, organizationId, branchId)

    const save = async () => {
      try {
        await Promise.all([
          putCache(key(POS_CACHE_SCOPES.items), items),
          putCache(key(POS_CACHE_SCOPES.categories), categories),
          putCache(key(POS_CACHE_SCOPES.menus), menus),
          putCache(key(POS_CACHE_SCOPES.cashSession), cashSession),
        ])
      } catch {
        // IndexedDB puede estar deshabilitado (modo privado). No es crítico.
      }
    }

    void save()
  }, [organizationId, branchId, items, categories, menus, cashSession])

  return null
}
