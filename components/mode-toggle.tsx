"use client"

import { MoonIcon, SunIcon } from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { formatShortcut, getShortcut } from "@/lib/keyboard/shortcuts"

const themeShortcut = formatShortcut(getShortcut("theme.toggle"))

/**
 * Alterna entre claro y oscuro.
 *
 * El botón muestra el tema al que se cambiará: en claro muestra "Oscuro" con
 * una luna y en oscuro muestra "Claro" con un sol. En móvil queda solo el
 * icono para no ocupar espacio en el header.
 */
export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const target = resolvedTheme === "dark" ? "light" : "dark"
  const targetLabel = target === "dark" ? "oscuro" : "claro"

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="sm:w-auto sm:gap-1.5 sm:px-2.5"
      title={`Cambiar a modo ${targetLabel} (${themeShortcut})`}
      aria-label={`Cambiar a modo ${targetLabel}`}
      onClick={() => setTheme(target)}
    >
      <MoonIcon className="size-4 dark:hidden" />
      <SunIcon className="hidden size-4 dark:block" />
      <span className="hidden sm:inline dark:hidden">Oscuro</span>
      <span className="hidden dark:sm:inline">Claro</span>
    </Button>
  )
}
