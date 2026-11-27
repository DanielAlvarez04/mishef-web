"use client"

import * as React from "react"
import {
  ArchiveRestoreIcon,
  ChevronDownIcon,
  Loader2Icon,
  PencilLineIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Item,
  ItemGroup,
  ItemSeparator,
} from "@/components/ui/item"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetClose,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ORDER_CHANNEL_LABELS } from "@/lib/orders"
import {
  deletePosDraft,
  resumePosDraft,
  type PosDraft,
} from "@/lib/pos-drafts"
import { groupDraftCart, type GroupedServiceItem } from "@/lib/pos-service"
import { cn } from "@/lib/utils"
import { PosChannelIcon } from "./pos-channel-icon"
import { SwipeableSheetContent } from "./swipeable-sheet-content"

function draftLabel(draft: PosDraft) {
  if (draft.channel === "DINE_IN") return "Mesa sin asignar"
  return ORDER_CHANNEL_LABELS[draft.channel]
}

function DraftItemsCollapsible({
  items,
}: {
  items: GroupedServiceItem[]
}) {
  const [open, setOpen] = React.useState(false)

  if (items.length === 0) return null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        type="button"
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDownIcon
          className={cn(
            "size-3.5 transition-transform",
            open && "rotate-180"
          )}
        />
        Artículos
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="flex flex-col gap-1 pt-2 text-xs text-muted-foreground">
          {items.map((item) => (
            <li key={item.key} className="truncate">
              {item.quantity}× {item.name}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}

/**
 * Bandeja de borradores de la sucursal.
 *
 * Los borradores caducan a los 15 minutos y los ve cualquier persona con
 * acceso al POS. Reanudar consume el borrador.
 */
export function PosDraftsSheet({
  open,
  onOpenChange,
  onResume,
  drafts,
  onDraftsChange,
  onRefresh,
  side = "bottom",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onResume: (draft: PosDraft) => void
  /** Lista ya cargada por el POS; se revalida en segundo plano. */
  drafts: PosDraft[]
  onDraftsChange: (drafts: PosDraft[]) => void
  /** Vuelve a consultar la lista cuando una acción falla. */
  onRefresh?: () => void
  side?: "bottom" | "right"
}) {
  const [pendingId, setPendingId] = React.useState<string | null>(null)

  const handleResume = async (draft: PosDraft) => {
    setPendingId(draft.id)

    try {
      const result = await resumePosDraft(draft.id)

      if (!result.ok || !result.data) {
        toast.error(result.message ?? "No se pudo reanudar el borrador")
        onRefresh?.()
        return
      }

      onResume(result.data)
      onOpenChange(false)
    } finally {
      setPendingId(null)
    }
  }

  const handleDelete = async (draft: PosDraft) => {
    setPendingId(draft.id)

    try {
      const result = await deletePosDraft(draft.id)

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo eliminar el borrador")
        onRefresh?.()
        return
      }

      onDraftsChange(drafts.filter((entry) => entry.id !== draft.id))
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SwipeableSheetContent
        side={side}
        showCloseButton={false}
        onOpenChange={onOpenChange}
        className={
          side === "right"
            ? "h-dvh gap-0 overflow-hidden rounded-none border-l p-0 sm:max-w-md"
            : "max-h-[80dvh] gap-0 overflow-hidden rounded-t-xl border-t p-0"
        }
      >
        <SheetHeader className="border-b">
          <div className="flex items-start justify-between gap-2">
            <div
              data-sheet-drag-handle
              className="flex min-w-0 touch-none flex-col gap-1"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums">
                  {drafts.length}
                </span>
                <SheetTitle>Comandas guardadas</SheetTitle>
              </div>
              <SheetDescription>
                Capturas sin enviar a cocina. Vencen a los 15 minutos y
                cualquier persona del POS puede reanudarlas.
              </SheetDescription>
            </div>
            <SheetClose
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Cerrar"
                />
              }
            >
              <XIcon />
            </SheetClose>
          </div>
        </SheetHeader>

        <ScrollArea
          className={
            side === "right"
              ? "max-h-[calc(100dvh-8rem)]"
              : "max-h-[60dvh]"
          }
        >
          <div className="px-4 py-2">
            {drafts.length === 0 ? (
              <p className="my-4 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No hay comandas guardadas.
              </p>
            ) : (
              <ItemGroup className="gap-0">
                {drafts.map((draft, index) => {
                  const busy = pendingId === draft.id
                  const items = groupDraftCart(draft.cart)

                  return (
                    <React.Fragment key={draft.id}>
                      {index > 0 ? <ItemSeparator /> : null}
                      <Item className="flex-col items-stretch gap-3 rounded-none border-0 p-0">
                        <div className="flex w-full items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <PosChannelIcon
                              channel={draft.channel}
                              className="size-4 shrink-0 text-muted-foreground"
                            />
                            <span className="truncate text-sm font-medium">
                              {draftLabel(draft)}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 px-2 text-xs"
                            title="Ver comanda"
                            disabled={busy}
                            onClick={() => void handleResume(draft)}
                          >
                            <PencilLineIcon data-icon="inline-start" />
                            Ver comanda
                          </Button>
                        </div>
                        <DraftItemsCollapsible items={items} />
                        <div className="flex w-full flex-col gap-2">
                          <Button
                            type="button"
                            variant="destructive"
                            className="w-full"
                            disabled={busy}
                            onClick={() => void handleDelete(draft)}
                          >
                            {busy ? (
                              <Loader2Icon
                                data-icon="inline-start"
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2Icon data-icon="inline-start" />
                            )}
                            Eliminar
                          </Button>
                          <Button
                            type="button"
                            className="w-full"
                            disabled={busy}
                            onClick={() => void handleResume(draft)}
                          >
                            {busy ? (
                              <Loader2Icon
                                data-icon="inline-start"
                                className="animate-spin"
                              />
                            ) : (
                              <ArchiveRestoreIcon data-icon="inline-start" />
                            )}
                            Reanudar
                          </Button>
                        </div>
                      </Item>
                    </React.Fragment>
                  )
                })}
              </ItemGroup>
            )}
          </div>
        </ScrollArea>
      </SwipeableSheetContent>
    </Sheet>
  )
}
