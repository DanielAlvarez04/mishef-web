"use client"

import { useEffect } from "react"

import { putCache } from "@/lib/offline/db"

/**
 * Guarda en IndexedDB la última copia buena de los datos del POS.
 *
 * Si mañana el POS se queda sin red, estos datos son los que permiten seguir
 * viendo catálogo, menús y turno de caja.
 */
export function OfflineSnapshot({
  items,
  categories,
  menus,
  cashSession,
}: {
  items: unknown
  categories: unknown
  menus: unknown
  cashSession: unknown
}) {
  useEffect(() => {
    const save = async () => {
      try {
        await Promise.all([
          putCache("pos.items", items),
          putCache("pos.categories", categories),
          putCache("pos.menus", menus),
          putCache("pos.cashSession", cashSession),
        ])
      } catch {
        // IndexedDB puede estar deshabilitado (modo privado). No es crítico.
      }
    }

    void save()
  }, [items, categories, menus, cashSession])

  return null
}
