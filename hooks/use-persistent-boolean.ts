"use client"

import { useCallback, useSyncExternalStore } from "react"

interface BooleanStore {
  value: boolean | null
  listeners: Set<() => void>
}

const stores = new Map<string, BooleanStore>()

function getStore(storageKey: string): BooleanStore {
  const existing = stores.get(storageKey)
  if (existing) return existing

  const store: BooleanStore = { value: null, listeners: new Set() }
  stores.set(storageKey, store)
  return store
}

function readBoolean(storageKey: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback

  try {
    const stored = window.localStorage.getItem(storageKey)
    if (stored === "true") return true
    if (stored === "false") return false
  } catch {
    // Sin `localStorage` (modo privado) se usa el valor por defecto.
  }

  return fallback
}

/**
 * Interruptor persistido en `localStorage`.
 *
 * Se usa para preferencias de presentación que deben sobrevivir a recargas y
 * cambios de ruta (por ejemplo, mostrar u ocultar los KPIs de una página).
 * Sigue el mismo patrón que `usePersistentTab` y `usePersistentViewMode`:
 * `useSyncExternalStore` evita desajustes de hidratación y `setState` dentro
 * de efectos.
 */
export function usePersistentBoolean(
  storageKey: string,
  fallback = true
): [boolean, (next: boolean | ((current: boolean) => boolean)) => void] {
  const getSnapshot = useCallback(() => {
    const store = getStore(storageKey)
    const current = store.value ?? readBoolean(storageKey, fallback)

    if (store.value === null) store.value = current
    return current
  }, [storageKey, fallback])

  const getServerSnapshot = useCallback(() => fallback, [fallback])

  const subscribe = useCallback(
    (listener: () => void) => {
      const store = getStore(storageKey)
      store.listeners.add(listener)

      const onStorage = (event: StorageEvent) => {
        if (event.key !== null && event.key !== storageKey) return

        store.value = readBoolean(storageKey, fallback)
        for (const notify of store.listeners) notify()
      }

      window.addEventListener("storage", onStorage)

      return () => {
        store.listeners.delete(listener)
        window.removeEventListener("storage", onStorage)
      }
    },
    [storageKey, fallback]
  )

  const stored = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  const setValue = useCallback(
    (next: boolean | ((current: boolean) => boolean)) => {
      const store = getStore(storageKey)
      const current = store.value ?? readBoolean(storageKey, fallback)
      const resolved = typeof next === "function" ? next(current) : next

      if (resolved === current && store.value !== null) return

      store.value = resolved

      try {
        window.localStorage.setItem(storageKey, String(resolved))
      } catch {
        // Sin persistencia disponible: el valor solo dura esta sesión.
      }

      for (const notify of store.listeners) notify()
    },
    [storageKey, fallback]
  )

  return [stored, setValue] as const
}
