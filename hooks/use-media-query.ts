"use client"

import { useCallback, useSyncExternalStore } from "react"

/**
 * Media query reactiva.
 *
 * `serverValue` define qué se renderiza en el servidor. Para paneles que deben
 * existir en el primer HTML de escritorio se pasa `true`; la hidratación
 * corrige el valor en móvil sin provocar un desajuste de React.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query)
      media.addEventListener("change", onChange)

      return () => media.removeEventListener("change", onChange)
    },
    [query]
  )

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query]
  )

  const getServerSnapshot = useCallback(() => serverValue, [serverValue])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
