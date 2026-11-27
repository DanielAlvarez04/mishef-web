"use client"

import * as React from "react"
import { BadgePercentIcon, SoupIcon, TrendingUpIcon, XIcon } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import {
  ArticleCardVisual,
  type ArticleCardTextSize,
} from "@/components/catalog/article-card-visual"
import { useShake } from "@/hooks/use-shake"
import { PosRenderProfiler } from "@/components/pos/pos-render-profiler"
import { type ItemListItem } from "@/lib/catalog"
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
 * Máximo de cards que se animan en un cambio de chip.
 *
 * Por encima de este número, el FLIP cuesta más que la ganancia visual: el
 * filtrado se aplica al instante y sin animación. El límite se calcula sobre
 * las cards que quedan visibles, no sobre las que había antes.
 */
const MAX_ANIMATED_CARDS = 30

/** Margen extra alrededor del viewport para animar cards cercanas. */
const ANIMATION_MARGIN_PX = 240

function isNearViewport(rect: DOMRect) {
  return (
    rect.bottom > -ANIMATION_MARGIN_PX &&
    rect.top < window.innerHeight + ANIMATION_MARGIN_PX
  )
}

/**
 * Card de artículo del POS.
 *
 * Está memoizada: al filtrar por chips, las cards que siguen visibles no se
 * vuelven a renderizar. `content-visibility` evita que las cards fuera de
 * pantalla paguen pintura y decodificación hasta que se acercan al viewport.
 */
const PosCatalogCard = React.memo(function PosCatalogCard({
  product,
  selected,
  textSize,
  square,
  showImages,
  groupColor,
  groupLabel,
  onOpen,
}: {
  product: ItemListItem
  selected: boolean
  textSize: ArticleCardTextSize
  square: boolean
  showImages: boolean
  groupColor: string | null
  groupLabel: string | null
  onOpen: (product: ItemListItem) => void
}) {
  const shakeRef = React.useRef<HTMLDivElement | null>(null)
  const money = useMoney()
  useShake(shakeRef, selected)

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
          showImage={showImages}
          aspect={square ? "square" : "wide"}
          isCombo={product.isCombo}
          fallbackColor={groupColor ?? "var(--muted)"}
          hideFallbackIcon
          className="transition-shadow [content-visibility:auto] group-hover:ring-2 group-hover:ring-ring/60"
          badge={
            groupLabel ? (
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
            ) : null
          }
        />
      </button>
    </div>
  )
})

interface PosCatalogFilters {
  groups: Array<string | null>
  promotionsOnly: boolean
  trendingOnly: boolean
}

interface FilterContext {
  groupSet: Set<string | null>
  promotionsOnly: boolean
  trendingOnly: boolean
  promotionItemIds: Set<string>
  trendingTopByGroup: Map<string | null, Set<string>>
}

function matchesFilters(
  product: ItemListItem,
  group: string | null,
  context: FilterContext
) {
  // Los chips especiales (Promociones/Tendencia) son un modo aparte: se
  // combinan entre sí con OR y nunca con los chips de grupo.
  if (context.promotionsOnly || context.trendingOnly) {
    const inPromotions =
      context.promotionsOnly && context.promotionItemIds.has(product.id)
    const inTrending =
      context.trendingOnly &&
      (context.trendingTopByGroup.get(group)?.has(product.id) ?? false)

    return inPromotions || inTrending
  }

  if (context.groupSet.size > 0 && !context.groupSet.has(group)) return false

  return true
}

interface PosCatalogProps {
  products: ItemListItem[]
  groupFilters: PosGroupFilter[]
  menuEntryByItem: Map<string, MenuItemEntry>
  /** Artículos con alguna promoción activa en el menú actual. */
  promotionItemIds: Set<string>
  /** Top 3 más vendido de cada grupo. */
  trendingTopByGroup: Map<string | null, Set<string>>
  /** Hay texto escrito en el buscador del POS. */
  hasSearch: boolean
  /** Limpia el texto del buscador. */
  onClearSearch: () => void
  selectedItemIds: Set<string>
  pendingProductId: string | null
  cardTextScale: ArticleCardTextSize
  squareCards: boolean
  showImages: boolean
  /** Nombre del menú fuera de horario; `null` cuando no hay aviso. */
  outOfScheduleMenuName: string | null
  onOpenProduct: (product: ItemListItem) => void
  /** Fila superior (filtros) que se mantiene sticky junto a los chips. */
  toolbar?: React.ReactNode
}

/**
 * Catálogo del POS con filtros por grupo.
 *
 * Vive separado del resto del POS para que un chip solo re-renderice esta
 * sección. La animación es un FLIP nativo con la Web Animations API: se
 * guardan las posiciones de las cards que seguirán visibles, se renderiza el
 * subconjunto y se animan solo esas cards.
 */
export const PosCatalog = React.memo(function PosCatalog({
  products,
  groupFilters,
  menuEntryByItem,
  promotionItemIds,
  trendingTopByGroup,
  hasSearch,
  onClearSearch,
  selectedItemIds,
  pendingProductId,
  cardTextScale,
  squareCards,
  showImages,
  outOfScheduleMenuName,
  onOpenProduct,
  toolbar,
}: PosCatalogProps) {
  const [filters, setFilters] = React.useState<PosCatalogFilters>({
    groups: [],
    promotionsOnly: false,
    trendingOnly: false,
  })
  const gridRef = React.useRef<HTMLDivElement | null>(null)
  const positionsRef = React.useRef<Map<string, DOMRect> | null>(null)

  const selectedGroupSet = React.useMemo(
    () => new Set(filters.groups),
    [filters.groups]
  )

  /**
   * Los chips responden al instante; la grilla se actualiza en un render de
   * menor prioridad. Así, tocar varios chips seguidos no bloquea la entrada
   * mientras se montan muchas cards.
   */
  const deferredFilters = React.useDeferredValue(filters)

  const colorByGroup = React.useMemo(
    () => new Map(groupFilters.map((filter) => [filter.group, filter.color])),
    [groupFilters]
  )

  const groupFor = React.useCallback(
    (product: ItemListItem) =>
      menuEntryByItem.get(product.id)?.group ?? null,
    [menuEntryByItem]
  )

  /** Color y etiqueta de grupo por artículo, calculados una sola vez. */
  const metaByItem = React.useMemo(() => {
    const map = new Map<string, { color: string | null; label: string | null }>()

    for (const product of products) {
      const group = groupFor(product)

      map.set(product.id, {
        color: groupColorValue(colorByGroup.get(group) ?? null),
        label: group ?? product.category?.name ?? null,
      })
    }

    return map
  }, [products, groupFor, colorByGroup])

  const visibleProducts = React.useMemo(() => {
    const context: FilterContext = {
      groupSet: new Set(deferredFilters.groups),
      promotionsOnly: deferredFilters.promotionsOnly,
      trendingOnly: deferredFilters.trendingOnly,
      promotionItemIds,
      trendingTopByGroup,
    }

    if (
      context.groupSet.size === 0 &&
      !context.promotionsOnly &&
      !context.trendingOnly
    ) {
      return products
    }

    return products.filter((product) =>
      matchesFilters(product, groupFor(product), context)
    )
  }, [
    products,
    deferredFilters,
    groupFor,
    promotionItemIds,
    trendingTopByGroup,
  ])

  const capturePositions = React.useCallback(
    (next: PosCatalogFilters) => {
      const grid = gridRef.current
      if (!grid) return

      const context: FilterContext = {
        groupSet: new Set(next.groups),
        promotionsOnly: next.promotionsOnly,
        trendingOnly: next.trendingOnly,
        promotionItemIds,
        trendingTopByGroup,
      }
      const nextVisible = new Set<string>()
      const hasFilters =
        context.groupSet.size > 0 ||
        next.promotionsOnly ||
        next.trendingOnly

      if (!hasFilters) {
        for (const product of products) nextVisible.add(product.id)
      } else {
        for (const product of products) {
          if (matchesFilters(product, groupFor(product), context)) {
            nextVisible.add(product.id)
          }
        }
      }

      // Catálogos grandes: filtrado instantáneo, sin lecturas de layout.
      if (nextVisible.size > MAX_ANIMATED_CARDS) {
        positionsRef.current = null
        return
      }

      const positions = new Map<string, DOMRect>()

      // Solo interesan las cards que seguirán visibles: las que salen se
      // desmontan sin animación, así que no se mide su posición.
      for (const element of grid.querySelectorAll<HTMLElement>(
        "[data-pos-item]"
      )) {
        const id = element.dataset.posId
        if (!id || !nextVisible.has(id)) continue

        // Una animación anterior no debe contaminar la posición de partida.
        element.getAnimations().forEach((animation) => animation.cancel())
        positions.set(id, element.getBoundingClientRect())
      }

      positionsRef.current = positions
    },
    [products, groupFor, promotionItemIds, trendingTopByGroup]
  )

  React.useLayoutEffect(() => {
    const previous = positionsRef.current
    if (!previous) return

    positionsRef.current = null

    const grid = gridRef.current
    if (!grid) return

    for (const element of grid.querySelectorAll<HTMLElement>(
      "[data-pos-item]"
    )) {
      const id = element.dataset.posId
      if (!id) continue

      const oldRect = previous.get(id)

      if (!oldRect) {
        const newRect = element.getBoundingClientRect()
        if (!isNearViewport(newRect)) continue

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
      if (!isNearViewport(newRect)) continue

      element.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: "translate(0, 0)" },
        ],
        { duration: 260, easing: "cubic-bezier(0.2, 0, 0, 1)" }
      )
    }
  }, [deferredFilters])

  function applyFilters(next: PosCatalogFilters) {
    capturePositions(next)
    setFilters(next)
  }

  function toggleGroup(group: string | null) {
    const groups = selectedGroupSet.has(group)
      ? filters.groups.filter((entry) => entry !== group)
      : [...filters.groups, group]

    // Elegir un grupo sale del modo Promociones/Tendencia.
    applyFilters({ groups, promotionsOnly: false, trendingOnly: false })
  }

  function togglePromotions() {
    // Los chips especiales no se combinan con grupos.
    applyFilters({
      ...filters,
      groups: [],
      promotionsOnly: !filters.promotionsOnly,
    })
  }

  function toggleTrending() {
    applyFilters({
      ...filters,
      groups: [],
      trendingOnly: !filters.trendingOnly,
    })
  }

  function clearFilters() {
    onClearSearch()
    applyFilters({ groups: [], promotionsOnly: false, trendingOnly: false })
  }

  const hasActiveFilters =
    filters.groups.length > 0 ||
    filters.promotionsOnly ||
    filters.trendingOnly ||
    hasSearch

  // Si el filtro quedó activo y los datos desaparecen (p. ej. una promoción
  // vencida), el chip sigue visible para poder desactivarlo.
  const showPromotions =
    promotionItemIds.size > 0 || filters.promotionsOnly
  const showTrending =
    trendingTopByGroup.size > 0 || filters.trendingOnly
  const hasChips = groupFilters.length > 0 || showPromotions || showTrending

  return (
    <PosRenderProfiler id="PosCatalog">
    <>
      <div className="filtros-acciones-mobile sticky top-0 z-30 -mx-4 flex min-w-0 flex-col gap-2 bg-neutral-50 px-4 py-2 lg:-mx-6 lg:px-6 dark:bg-neutral-950 xl:static xl:z-auto xl:mx-0 xl:gap-3 xl:bg-transparent xl:px-0 xl:py-0">
        {toolbar}
        {hasChips ? (
          <div className="grupos-chips no-scrollbar -mx-4 -my-1 overflow-x-auto px-4 py-1 lg:mx-0 lg:my-0 lg:overflow-visible lg:p-0">
            <div className="flex flex-wrap items-center gap-2 max-md:w-[125%] md:w-[calc(100%+100px)] lg:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasActiveFilters}
                aria-label="Eliminar filtros"
                className={cn(
                  "max-w-[14rem]",
                  jalapenoChipClass(false),
                  "border-destructive/50 bg-destructive/10 text-destructive hover:border-destructive/60 hover:bg-destructive/20 hover:text-destructive dark:border-destructive/50 dark:bg-destructive/20 dark:hover:bg-destructive/30"
                )}
                onClick={clearFilters}
              >
                <XIcon />
                <span className="truncate">Eliminar</span>
              </Button>

              {showPromotions ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-pressed={filters.promotionsOnly}
                  className={cn(
                    "max-w-[14rem]",
                    jalapenoChipClass(filters.promotionsOnly)
                  )}
                  onClick={togglePromotions}
                >
                  <BadgePercentIcon />
                  <span className="truncate">Promociones</span>
                </Button>
              ) : null}

              {showTrending ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-pressed={filters.trendingOnly}
                  className={cn(
                    "max-w-[14rem]",
                    jalapenoChipClass(filters.trendingOnly)
                  )}
                  onClick={toggleTrending}
                >
                  <TrendingUpIcon />
                  <span className="truncate">Tendencia</span>
                </Button>
              ) : null}

              {groupFilters.map((filter) => {
                const selected = selectedGroupSet.has(filter.group)

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
          </div>
        ) : null}
      </div>

      {outOfScheduleMenuName ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          «{outOfScheduleMenuName}» está fuera de horario. Puedes consultarlo,
          pero revisa la disponibilidad antes de enviar la comanda.
        </p>
      ) : null}

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
          {visibleProducts.map((product) => {
            const meta = metaByItem.get(product.id)

            return (
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
                  showImages={showImages}
                  groupColor={meta?.color ?? null}
                  groupLabel={meta?.label ?? null}
                  onOpen={onOpenProduct}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Espacio para el botón flotante de comanda en móvil. */}
      <div aria-hidden className="h-16 xl:hidden" />
    </>
    </PosRenderProfiler>
  )
})
