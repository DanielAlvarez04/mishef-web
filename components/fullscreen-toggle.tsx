"use client"

import * as React from "react"
import { Maximize2Icon, Minimize2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"

/** Botón de pantalla completa del header, disponible en todas las páginas. */
export function FullscreenToggle() {
  const [fullscreen, setFullscreen] = React.useState(false)

  React.useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement))

    document.addEventListener("fullscreenchange", onChange)
    onChange()

    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  async function toggle() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      // El navegador puede bloquear la solicitud (permisos o iOS).
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      title={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
      aria-label={
        fullscreen ? "Salir de pantalla completa" : "Pantalla completa"
      }
      onClick={() => void toggle()}
    >
      {fullscreen ? (
        <Minimize2Icon className="size-4" />
      ) : (
        <Maximize2Icon className="size-4" />
      )}
    </Button>
  )
}
