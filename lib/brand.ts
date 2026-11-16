/** Utilidades de marca blanca por negocio. */

export interface Brand {
  name: string
  color: string | null
  logoUrl: string | null
}

/** Color por defecto de Mishef (naranja). */
export const DEFAULT_BRAND_COLOR = "#e2703a"

/**
 * Texto legible sobre un color de fondo.
 *
 * Usa luminancia perceptual (0.299R + 0.587G + 0.114B): si el color es claro,
 * el texto va oscuro; si es oscuro, blanco.
 */
export function readableForeground(hex: string): string {
  const value = hex.replace("#", "")
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return "#ffffff"

  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return luminance > 0.62 ? "#1a1a1a" : "#ffffff"
}

/**
 * Variables CSS de la marca para aplicar en un contenedor.
 *
 * Al declararlas en un `style` se heredan a todo el subárbol y sobrescriben
 * las del tema sin tocar `globals.css`.
 */
export function brandStyle(color?: string | null): React.CSSProperties {
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) return {}

  return {
    ["--primary" as string]: color,
    ["--primary-foreground" as string]: readableForeground(color),
  } as React.CSSProperties
}
