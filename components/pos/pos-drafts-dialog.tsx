"use client"

import * as React from "react"
import { ArchiveRestoreIcon, Clock3Icon, Loader2Icon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useMoney } from "@/lib/currency"
import { ORDER_CHANNEL_LABELS } from "@/lib/orders"
import {
  deletePosDraft,
  listPosDrafts,
  resumePosDraft,
  type PosDraft,
} from "@/lib/pos-drafts"

function expiryLabel(expiresAt: string) {
  return new Date(expiresAt).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function draftTitle(draft: PosDraft) {
  if (draft.customerName?.trim()) return draft.customerName.trim()
  if (draft.tableNumber?.trim()) return `Mesa ${draft.tableNumber.trim()}`

  return ORDER_CHANNEL_LABELS[draft.channel]
}

/**
 * Bandeja de borradores de la sucursal.
 *
 * Los borradores caducan a los 15 minutos y los ve cualquier persona con
 * acceso al POS. Reanudar consume el borrador.
 */
export function PosDraftsDialog({
  open,
  onOpenChange,
  onResume,
  onCountChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onResume: (draft: PosDraft) => void
  onCountChange?: (count: number) => void
}) {
  const money = useMoney()
  const [drafts, setDrafts] = React.useState<PosDraft[]>([])
  const [loading, setLoading] = React.useState(false)
  const [pendingId, setPendingId] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    setLoading(true)

    try {
      const result = await listPosDrafts()

      if (!result.ok || !result.data) {
        toast.error(result.message ?? "No se pudieron cargar los borradores")
        return
      }

      setDrafts(result.data)
      onCountChange?.(result.data.length)
    } finally {
      setLoading(false)
    }
  }, [onCountChange])

  React.useEffect(() => {
    if (!open) return

    const timer = window.setTimeout(() => void refresh(), 0)

    return () => window.clearTimeout(timer)
  }, [open, refresh])

  const handleResume = async (draft: PosDraft) => {
    setPendingId(draft.id)

    try {
      const result = await resumePosDraft(draft.id)

      if (!result.ok || !result.data) {
        toast.error(result.message ?? "No se pudo reanudar el borrador")
        await refresh()
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
        return
      }

      setDrafts((current) => {
        const next = current.filter((entry) => entry.id !== draft.id)
        onCountChange?.(next.length)
        return next
      })
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" mobile="full">
        <DialogHeader>
          <DialogTitle>Borradores</DialogTitle>
          <DialogDescription>
            Capturas sin enviar a cocina. Se eliminan solas a los 15 minutos y
            cualquier persona del POS puede reanudarlas.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Cargando borradores…
          </div>
        ) : drafts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No hay borradores activos.
          </div>
        ) : (
          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
            {drafts.map((draft) => {
              const busy = pendingId === draft.id
              const expires = expiryLabel(draft.expiresAt)

              return (
                <div
                  key={draft.id}
                  className="flex flex-col gap-2 rounded-lg border p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{draftTitle(draft)}</p>
                      <p className="text-xs text-muted-foreground">
                        {ORDER_CHANNEL_LABELS[draft.channel]}
                        {draft.tableNumber && draft.channel === "DINE_IN"
                          ? ` · Mesa ${draft.tableNumber}`
                          : ""}
                        {` · ${draft.itemCount} artículo${draft.itemCount === 1 ? "" : "s"}`}
                      </p>
                    </div>
                    <p className="shrink-0 font-medium tabular-nums">
                      {money(Number(draft.total))}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">
                      <Clock3Icon />
                      Vence {expires}
                    </Badge>
                    {draft.createdByName ? (
                      <span>Guardado por {draft.createdByName}</span>
                    ) : null}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => void handleDelete(draft)}
                    >
                      <Trash2Icon />
                      Eliminar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() => void handleResume(draft)}
                    >
                      {busy ? (
                        <Loader2Icon className="animate-spin" />
                      ) : (
                        <ArchiveRestoreIcon />
                      )}
                      Reanudar
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
