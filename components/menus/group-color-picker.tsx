"use client"

import { cn } from "cn"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  GROUP_COLOR_SEQUENCE,
  groupColorLabel,
  groupColorValue,
} from "@/lib/group-colors"

/**
 * Selector de color de una sección del menú.
 *
 * El disparador es solo un cuadro del color actual (sin texto) y el popover
 * muestra toda la paleta en una rejilla de máximo cinco columnas. Los colores
 * que ya usa otra sección quedan deshabilitados.
 */
export function GroupColorPicker({
  group,
  color,
  usedColors,
  disabled = false,
  onChange,
}: {
  group: string
  color: string | null
  usedColors: Set<string>
  disabled?: boolean
  onChange: (color: string) => void
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            disabled={disabled}
            aria-label={`Color de ${group}`}
            title={
              color ? `Color: ${groupColorLabel(color)}` : "Elegir color"
            }
            className={cn(
              "size-8 shrink-0 rounded-md border border-black/15 shadow-xs transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20",
              !color && "border-dashed bg-muted"
            )}
            style={
              color
                ? { backgroundColor: groupColorValue(color) ?? undefined }
                : undefined
            }
          />
        }
      />
      <PopoverContent align="start" className="w-64 p-2">
        <div className="grid max-h-72 grid-cols-5 gap-1.5 overflow-y-auto">
          {GROUP_COLOR_SEQUENCE.map((token) => {
            const selected = token === color
            const used = usedColors.has(token) && !selected

            return (
              <button
                key={token}
                type="button"
                title={
                  used ? `${groupColorLabel(token)} · en uso` : groupColorLabel(token)
                }
                aria-label={
                  used
                    ? `${groupColorLabel(token)}, en uso por otro grupo`
                    : groupColorLabel(token)
                }
                aria-pressed={selected}
                disabled={disabled || used}
                onClick={() => onChange(token)}
                className={cn(
                  "size-8 rounded-md border border-black/15 shadow-xs transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none dark:border-white/20",
                  selected && "ring-2 ring-ring ring-offset-2",
                  used && "cursor-not-allowed opacity-25 grayscale",
                  !used && !disabled && "hover:scale-105"
                )}
                style={{ backgroundColor: groupColorValue(token) ?? undefined }}
              />
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
