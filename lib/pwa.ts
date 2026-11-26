/**
 * Utilidades compartidas para la instalación de la PWA.
 *
 * El evento `beforeinstallprompt` solo existe en navegadores Chromium y se
 * emite una vez por carga. El script del layout raíz lo guarda en
 * `window.__pwaInstallPrompt` para que los componentes que se montan después
 * (por ejemplo, tras iniciar sesión) todavía puedan abrir el prompt nativo.
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

declare global {
  interface Window {
    __pwaInstallPrompt?: BeforeInstallPromptEvent
  }
}

/** Suscripción vacía para valores que no cambian durante la vida de la página. */
export function subscribeToNothing() {
  return () => {}
}

export function readStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari iOS
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function readIos(): boolean {
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent)
}

export const readFalse = () => false

/** Clave y versión del aviso de instalación. */
export const PWA_INSTALL_DISMISS_KEY = "pwa-install-dismissed"
export const PWA_INSTALL_DISMISS_VERSION = "1"

export function readInstallDismissed(): boolean {
  try {
    return (
      window.localStorage.getItem(PWA_INSTALL_DISMISS_KEY) ===
      PWA_INSTALL_DISMISS_VERSION
    )
  } catch {
    return false
  }
}

export function dismissInstallPrompt() {
  try {
    window.localStorage.setItem(
      PWA_INSTALL_DISMISS_KEY,
      PWA_INSTALL_DISMISS_VERSION
    )
  } catch {
    // Sin persistencia disponible: se vuelve a mostrar en la próxima sesión.
  }
}

/** Script que captura el prompt nativo antes de que hidrate React. */
export const PWA_INSTALL_CAPTURE_SCRIPT =
  "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__pwaInstallPrompt=e});"
