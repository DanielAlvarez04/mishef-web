"use client"

import * as React from "react"
import { DownloadIcon, SmartphoneIcon } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  dismissInstallPrompt,
  readFalse,
  readInstallDismissed,
  readIos,
  readStandalone,
  subscribeToNothing,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa"

/**
 * Aviso de instalación de la PWA para quienes usan la app en una pestaña del
 * navegador.
 *
 * - Si Chromium ya emitió `beforeinstallprompt`, ofrece el botón nativo.
 * - En iOS (o sin prompt disponible) muestra los pasos manuales.
 * - No aparece si la app ya corre instalada y recuerda el descarte por
 *   versión en `localStorage`.
 */
export function InstallAppDialog() {
  const isStandalone = React.useSyncExternalStore(
    subscribeToNothing,
    readStandalone,
    readFalse
  )
  const isIos = React.useSyncExternalStore(subscribeToNothing, readIos, readFalse)
  const [promptEvent, setPromptEvent] =
    React.useState<BeforeInstallPromptEvent | null>(() =>
      typeof window === "undefined" ? null : (window.__pwaInstallPrompt ?? null)
    )
  const [installed, setInstalled] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const handlePrompt = (event: Event) => {
      event.preventDefault()
      window.__pwaInstallPrompt = event as BeforeInstallPromptEvent
      setPromptEvent(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => {
      setInstalled(true)
      setPromptEvent(null)
      setOpen(false)
    }

    window.addEventListener("beforeinstallprompt", handlePrompt)
    window.addEventListener("appinstalled", handleInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt)
      window.removeEventListener("appinstalled", handleInstalled)
    }
  }, [])

  React.useEffect(() => {
    if (isStandalone || installed) return
    if (readInstallDismissed()) return

    // Se deja pasar el primer pintado y la carga del prompt nativo.
    const timer = window.setTimeout(() => setOpen(true), 3000)

    return () => window.clearTimeout(timer)
  }, [isStandalone, installed])

  async function handleInstall() {
    if (!promptEvent) return

    try {
      await promptEvent.prompt()
      const choice = await promptEvent.userChoice

      if (choice.outcome === "accepted") {
        setInstalled(true)
      }
    } catch {
      // El navegador puede rechazar el prompt (permisos o iOS).
    } finally {
      setPromptEvent(null)
      window.__pwaInstallPrompt = undefined
      setOpen(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) dismissInstallPrompt()
      }}
    >
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-primary/10 text-primary">
            <SmartphoneIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Instala Mishef en este dispositivo</AlertDialogTitle>
          <AlertDialogDescription>
            {promptEvent ? (
              "Ábrela como una app, sin la barra del navegador. Además conserva las comandas pendientes si se corta la conexión."
            ) : isIos ? (
              <>
                En iPhone o iPad: toca <strong>Compartir</strong> y luego{" "}
                <strong>Agregar a pantalla de inicio</strong>.
              </>
            ) : (
              <>
                Abre el menú del navegador y elige{" "}
                <strong>Instalar aplicación</strong> (o{" "}
                <strong>Agregar a la pantalla de inicio</strong>).
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          {promptEvent ? (
            <>
              <AlertDialogCancel>Ahora no</AlertDialogCancel>
              <AlertDialogAction onClick={() => void handleInstall()}>
                <DownloadIcon />
                Instalar aplicación
              </AlertDialogAction>
            </>
          ) : (
            <AlertDialogAction>Entendido</AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
