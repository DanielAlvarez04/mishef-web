"use client"

import * as React from "react"

import { SheetContent } from "@/components/ui/sheet"
import { cn } from "cn"

/**
 * Sheet inferior que se cierra al deslizar hacia abajo.
 *
 * El gesto se inicia en el asa o en el encabezado para no competir con el
 * scroll de la lista. El panel sigue al dedo y se cierra si supera 90 px.
 */
export function SwipeableSheetContent({
  onOpenChange,
  children,
  style,
  ...props
}: React.ComponentProps<typeof SheetContent> & {
  onOpenChange: (open: boolean) => void
}) {
  const swipeEnabled = (props.side ?? "bottom") === "bottom"
  const startY = React.useRef<number | null>(null)
  const [dragY, setDragY] = React.useState(0)

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!swipeEnabled) return
    if (event.touches.length !== 1) return

    const target = event.target as HTMLElement
    const scrollable = target.closest(
      '[data-slot="scroll-area"], .overflow-y-auto'
    ) as HTMLElement | null
    const onHandle = Boolean(target.closest("[data-sheet-drag-handle]"))

    if (!onHandle && !scrollable) return

    // Si la lista ya está desplazada, el gesto pertenece al scroll.
    if (scrollable) {
      const scrollTop = scrollable.matches('[data-slot="scroll-area"]')
        ? (scrollable.querySelector(
            '[data-slot="scroll-area-viewport"]'
          ) as HTMLElement | null)?.scrollTop ?? 0
        : scrollable.scrollTop

      if (scrollTop > 0) return
    }

    startY.current = event.touches[0].clientY
    setDragY(0)
  }

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!swipeEnabled) return
    if (startY.current === null) return

    const delta = event.touches[0].clientY - startY.current
    setDragY(Math.max(0, delta))
  }

  const handleTouchEnd = () => {
    if (!swipeEnabled) return
    if (startY.current === null) return

    const shouldClose = dragY > 90

    startY.current = null
    setDragY(0)

    if (shouldClose) onOpenChange(false)
  }

  return (
    <SheetContent
      {...props}
      style={
        dragY > 0
          ? {
              ...style,
              transform: `translateY(${dragY}px)`,
              transition: "none",
            }
          : style
      }
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div
        data-sheet-drag-handle
        className={cn(
          "flex touch-none justify-center pt-2 pb-1",
          !swipeEnabled && "hidden"
        )}
      >
        <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
      </div>
      {children}
    </SheetContent>
  )
}
