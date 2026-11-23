"use client"

import * as React from "react"

interface WakeLockSentinelLike {
  release: () => Promise<void>
  addEventListener: (type: "release", listener: () => void) => void
}

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>
  }
}

/**
 * Mantiene la pantalla encendida mientras el componente está montado.
 *
 * La API solo existe en navegadores compatibles y contextos seguros; si no
 * está disponible o el sistema la rechaza (batería baja, política del
 * navegador), la app sigue funcionando sin hacer nada.
 *
 * El bloqueo se vuelve a pedir al regresar a la pestaña porque el navegador lo
 * libera automáticamente cuando la página se oculta.
 */
export function useWakeLock(enabled = true) {
  React.useEffect(() => {
    if (!enabled) return

    const wakeLock = (navigator as WakeLockNavigator).wakeLock
    if (!wakeLock) return

    let sentinel: WakeLockSentinelLike | null = null
    let requesting = false
    let disposed = false

    const release = () => {
      const current = sentinel
      sentinel = null

      if (current) {
        void current.release().catch(() => {})
      }
    }

    const request = async () => {
      if (disposed || requesting) return
      if (document.visibilityState !== "visible") return

      requesting = true

      try {
        const lock = await wakeLock.request("screen")

        if (disposed) {
          void lock.release().catch(() => {})
          return
        }

        sentinel = lock
        lock.addEventListener("release", () => {
          if (sentinel === lock) sentinel = null
        })
      } catch {
        // El navegador puede rechazar la solicitud; no es un error de la app.
      } finally {
        requesting = false
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void request()
    }

    void request()
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      disposed = true
      document.removeEventListener("visibilitychange", onVisibilityChange)
      release()
    }
  }, [enabled])
}
