"use client"

import * as React from "react"
import { GroupIcon, SoupIcon } from "lucide-react"
import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  ArticleCardVisual,
  type ArticleCardTextSize,
} from "@/components/catalog/article-card-visual"
import { useShake } from "@/hooks/use-shake"
import {
  PROMOTION_TYPE_LABELS,
  type ItemListItem,
} from "@/lib/catalog"
import { jalapenoChipClass } from "@/lib/chips"
import { useMoney } from "@/lib/currency"
import { groupColorValue } from "@/lib/group-colors"
import type { MenuItemEntry } from "@/lib/menus"

export interface PosGroupFilter {
  group: string | null
  label: string
  color: string | null
}

/**
 * Card de artículo del POS.
 *
 * La visibilidad la controla el wrapper de la grilla. Así, al filtrar por un
 * chip, esta card no se vuelve a renderizar: solo cambia el `hidden` del
 * wrapper y el navegador anima su posición.
 */
const PosCatalogCard = React.memo(function PosCatalogCard({
  product,
  selected,
  textSize,
  square,
  groupColor,
  groupLabel,
  onOpen,
}: {
  product: ItemListItem
  selected: boolean
  textSize: ArticleCardTextSize
  square: boolean
  groupColor: string | null
  groupLabel: string | null
  onOpen: (product: ItemListItem) => void
}) {
  const shakeRef = React.useRef<HTMLDivElement | null>(null)
  const money = useMoney()
  useShake(shakeRef, selected)

  const promotion = product.promotions?.find((entry) => entry.isActive)
  const hasBadges = Boolean(groupLabel || product.isCombo || promotion)

  return (
    <div ref={shakeRef} className={cn(selected && "np-menu-card-shake")}>
      <button
        type="button"
        onClick={() => onOpen(product)}
        aria-label={`Abrir ${product.name}`}
        className="group block w-full rounded-xl text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <ArticleCardVisual
          name={product.name}
          price={money(product.price)}
          imageUrl={product.imageUrl}
          imageVariants={product.imageVariants}
          isActive={product.isActive}
          selected={selected}
          compact
          textSize={textSize}
          showImage
          aspect={square ? "square" : "wide"}
          isCombo={product.isCombo}
          fallbackColor={groupColor ?? "var(--muted)"}
          hideFallbackIcon
          className="transition-shadow group-hover:ring-2 group-hover:ring-ring/60"
          badge={
            hasBadges ? (
              <div className="flex min-w-0 flex-col items-start gap-1">
                {groupLabel ? (
                  <span
                    aria-label={`Grupo: ${groupLabel}`}
                    title={groupLabel}
                    className="flex w-fit items-center rounded-full bg-neutral-50 p-1 dark:bg-neutral-950"
                  >
                    <span
                      aria-hidden
                      className="size-4 shrink-0 rounded-full border border-black/10 dark:border-white/20"
                      style={{ backgroundColor: groupColor ?? "var(--muted)" }}
                    />
                  </span>
                ) : null}
                {product.isCombo ? (
                  <Badge
                    variant="outline"
                    size="sm"
                    title="Combo"
                    aria-label="Combo"
                    className="border-sky-400 bg-sky-400/10 text-sky-400 backdrop-blur-sm"
                  >
                    <GroupIcon />
                  </Badge>
                ) : null}
                {promotion ? (
                  <Badge
                    variant="outline"
                    size="sm"
                    className="border-sky-300/50 bg-sky-500/25 text-[10px] text-white backdrop-blur-sm"
                  >
                    {PROMOTION_TYPE_LABELS[promotion.type]}
                  </Badge>
                ) : null}
              </div>
            ) : null
          }
        />
      </button>
    </div>
  )
})

/**
 * Catálogo del POS con filtros por grupo.
 *
 * Vive separado del resto del POS para que un chip solo re-renderice esta
 * sección. La animación es un FLIP nativo con la Web Animations API: se
 * conservan las posiciones anteriores, se renderiza el subconjunto y se
 * animan las cards que quedan.
 */
export function PosCatalog({
  products,
  groupFilters,
  menuEntryByItem,
  selectedItemIds,
  pendingProductId,
  cardTextScale,
  squareCards,
  notice,
  onOpenProduct,
}: {
  products: ItemListItem[]
  groupFilters: PosGroupFilter[]
  menuEntryByItem: Map<string, MenuItemEntry>
  selectedItemIds: Set<string>
  pendingProductId: string | null
  cardTextScale: ArticleCardTextSize
  squareCards: boolean
  notice?: React.ReactNode
  onOpenProduct: (product: ItemListItem) => void
}) {
  const [selectedGroups, setSelectedGroups] = React.useState<
    Array<string | null>
  >([])
  const gridRef = React.useRef<HTMLDivElement | null>(null)
  const positionsRef = React.useRef<Map<string, DOMRect>>(new Map())

  const colorByGroup = React.useMemo(
    () => new Map(groupFilters.map((filter) => [filter.group, filter.color])),
    [groupFilters]
  )

  const groupFor = React.useCallback(
    (product: ItemListItem) =>
      menuEntryByItem.get(product.id)?.group ?? null,
    [menuEntryByItem]
  )

  const groupColorFor = (product: ItemListItem) =>
    groupColorValue(colorByGroup.get(groupFor(product)) ?? null)

  const groupLabelFor = (product: ItemListItem) =>
    groupFor(product) ?? product.category?.name ?? null

  const visibleProducts = React.useMemo(() => {
    if (selectedGroups.length === 0) return products

    return products.filter((product) =>
      selectedGroups.includes(groupFor(product))
    )
  }, [products, selectedGroups, groupFor])

  const capturePositions = React.useCallback(() => {
    const grid = gridRef.current
    if (!grid) return

    const positions = new Map<string, DOMRect>()

    for (const element of grid.querySelectorAll<HTMLElement>(
      "[data-pos-item]"
    )) {
      const id = element.dataset.posId
      if (!id) continue

      // Una animación anterior no debe contaminar la posición de partida.
      element.getAnimations().forEach((animation) => animation.cancel())
      positions.set(id, element.getBoundingClientRect())
    }

    positionsRef.current = positions
  }, [])

  React.useLayoutEffect(() => {
    const previous = positionsRef.current
    if (previous.size === 0) return

    positionsRef.current = new Map()

    const grid = gridRef.current
    if (!grid) return

    for (const element of grid.querySelectorAll<HTMLElement>(
      "[data-pos-item]"
    )) {
      const id = element.dataset.posId
      if (!id) continue

      const oldRect = previous.get(id)

      if (!oldRect) {
        element.animate(
          [
            { opacity: 0, transform: "scale(0.96)" },
            { opacity: 1, transform: "scale(1)" },
          ],
          { duration: 180, easing: "ease-out" }
        )
        continue
      }

      const newRect = element.getBoundingClientRect()
      const dx = oldRect.left - newRect.left
      const dy = oldRect.top - newRect.top

      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue

      element.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: "translate(0, 0)" },
        ],
        { duration: 260, easing: "cubic-bezier(0.2, 0, 0, 1)" }
      )
    }
  }, [selectedGroups])

  function toggleGroup(group: string | null) {
    capturePositions()
    setSelectedGroups((current) =>
      current.includes(group)
        ? current.filter((entry) => entry !== group)
        : [...current, group]
    )
  }

  return (
    <>
      {groupFilters.length > 0 ? (
        <>
          <Separator />
          <div className="flex flex-wrap items-center gap-2">
            {groupFilters.map((filter) => {
              const selected = selectedGroups.includes(filter.group)

              return (
                <Button
                  key={filter.group ?? "__none__"}
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-pressed={selected}
                  className={cn("max-w-[14rem]", jalapenoChipClass(selected))}
                  onClick={() => toggleGroup(filter.group)}
                >
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-full border border-black/10 dark:border-white/20"
                    style={{
                      backgroundColor:
                        groupColorValue(filter.color) ?? "var(--muted)",
                    }}
                  />
                  <span className="truncate">{filter.label}</span>
                </Button>
              )
            })}
          </div>
        </>
      ) : null}

      {notice}

      {visibleProducts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-14 text-center text-sm text-muted-foreground">
          <SoupIcon className="size-8" />
          No hay artículos que coincidan con el filtro.
        </div>
      ) : (
        <div
          ref={gridRef}
          className="grid grid-cols-2 gap-2 md:grid-cols-[repeat(var(--np-pos-card-columns,4),minmax(0,1fr))]"
        >
          {visibleProducts.map((product) => (
            <div
              key={product.id}
              data-pos-item=""
              data-pos-id={product.id}
            >
              <PosCatalogCard
                product={product}
                selected={
                  selectedItemIds.has(product.id) ||
                  pendingProductId === product.id
                }
                textSize={cardTextScale}
                square={squareCards}
                groupColor={groupColorFor(product)}
                groupLabel={groupLabelFor(product)}
                onOpen={onOpenProduct}
              />
            </div>
          ))}
        </div>
      )}
    </>
  )
}
