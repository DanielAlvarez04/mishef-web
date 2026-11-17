/** Coordenadas del navegador; vacío si no hay permiso o soporte. */
export interface BrowserCoordinates {
  latitude?: number
  longitude?: number
}

/**
 * Pide la ubicación sin bloquear la checada.
 *
 * Aunque el navegador deje el permiso sin responder, el `setTimeout` resuelve
 * con `{}` para que el registro continúe. Si no hay coordenadas, la API no
 * puede evaluar la geocerca y deja la checada sin esa marca.
 */
export function getCurrentCoordinates(
  timeoutMs = 4_000
): Promise<BrowserCoordinates> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return Promise.resolve({})
  }

  return new Promise((resolve) => {
    let settled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const finish = (value: BrowserCoordinates) => {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      resolve(value)
    }

    timer = setTimeout(() => finish({}), timeoutMs)

    navigator.geolocation.getCurrentPosition(
      (position) =>
        finish({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => finish({}),
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 60_000,
      }
    )
  })
}
