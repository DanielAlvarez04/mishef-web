import * as React from "react"

// La barra inferior reemplaza al sidebar hasta que hay espacio para ambos
// (tablet horizontal y escritorio). El corte coincide con `lg:` de Tailwind.
const MOBILE_BREAKPOINT = 1024
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", onChange)

  return () => mql.removeEventListener("change", onChange)
}

/** `true` cuando el viewport es móvil. Sin `setState` dentro de un efecto. */
export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  )
}
