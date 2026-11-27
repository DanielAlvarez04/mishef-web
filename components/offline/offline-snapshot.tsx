"use client"

import { useEffect, useRef } from "react"

import { POS_CACHE_SCOPES, tenantCacheKey } from "@/lib/offline/cache-keys"
import { putCache } from "@/lib/offline/db"

/**
 * Guarda en IndexedDB la última copia buena de los datos del POS.
 *
 * Las claves incluyen organización y sucursal: dos negocios en el mismo
 * dispositivo nunca comparten catálogo, menús ni turno de caja.
 *
 * `signature` resume el contenido: si un refresh de órdenes trae los mismos
 * datos, no se vuelve a escribir todo el catálogo en IndexedDB.
 */
export function OfflineSnapshot({
  organizationId,
  branchId,
  items,
  categories,
  menus,
  cashSession,
  signature,
}: {
  organizationId: string
  branchId: string | null
  items: unknown
  categories: unknown
  menus: unknown
  cashSession: unknown
  signature: string
}) {
  const dataRef = useRef({ items, categories, menus, cashSession })

  useEffect(() => {
    dataRef.current = { items, categories, menus, cashSession }
  }, [items, categories, menus, cashSession])

  useEffect(() => {
    const key = (scope: string) =>
      tenantCacheKey(scope, organizationId, branchId)

    const save = async () => {
      const data = dataRef.current

      try {
        await Promise.all([
          putCache(key(POS_CACHE_SCOPES.items), data.items),
          putCache(key(POS_CACHE_SCOPES.categories), data.categories),
          putCache(key(POS_CACHE_SCOPES.menus), data.menus),
          putCache(key(POS_CACHE_SCOPES.cashSession), data.cashSession),
        ])
      } catch {
        // IndexedDB puede estar deshabilitado (modo privado). No es crítico.
      }
    }

    void save()
  }, [organizationId, branchId, signature])

  return null
}
