"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  CheckCircle2Icon,
  ImagePlusIcon,
  Loader2Icon,
  ReceiptTextIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  createTicket,
  getRecentTickets,
  presignTicket,
} from "@/app/(app)/purchases/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  purchaseStatusLabel,
  purchaseStatusVariant,
  type PurchaseListItem,
} from "@/lib/purchases"
import { cn } from "@/lib/utils"

const MAX_TICKET_BYTES = 10 * 1024 * 1024
const MAX_FILES = 100
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"])
const POLL_INTERVAL = 2500
const MAX_POLLS = 40

type RowStatus = "pending" | "uploading" | "processing" | "done" | "error"

interface UploadRow {
  id: string
  file: File
  status: RowStatus
  purchaseId?: string
  message?: string
  supplier?: string | null
  total?: string
  lines?: number
}

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

function validateFile(file: File): string | null {
  if (!ACCEPTED.has(file.type)) {
    return "Formato no admitido. Usa JPG, PNG o WebP."
  }

  if (file.size === 0) return "El archivo está vacío."
  if (file.size > MAX_TICKET_BYTES) return "Supera el máximo de 10 MB."

  return null
}

function rowVariant(
  status: RowStatus
): "destructive" | "secondary" | "outline" | "success" {
  if (status === "error") return "destructive"
  if (status === "done") return "success"
  if (status === "uploading" || status === "processing") return "secondary"
  return "outline"
}

function rowLabel(status: RowStatus): string {
  switch (status) {
    case "uploading":
      return "Subiendo"
    case "processing":
      return "Leyendo con IA"
    case "done":
      return "Procesado"
    case "error":
      return "Error"
    default:
      return "Pendiente"
  }
}

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date)
}

/** Mezcla los tickets recientes con las filas de la cola de subida. */
function mergeTicketsIntoRows(
  rows: UploadRow[],
  tickets: PurchaseListItem[]
): UploadRow[] {
  return rows.map((row) => {
    if (!row.purchaseId) return row

    const ticket = tickets.find((candidate) => candidate.id === row.purchaseId)

    if (!ticket) return row

    const status: RowStatus =
      ticket.status === "PROCESSING"
        ? "processing"
        : ticket.status === "FAILED"
          ? "error"
          : "done"

    return {
      ...row,
      status,
      supplier: ticket.supplier?.name ?? null,
      total: ticket.total,
      lines: ticket._count.items,
      message:
        ticket.status === "FAILED"
          ? "La IA no pudo leerlo; se puede capturar a mano."
          : row.message,
    }
  })
}

/**
 * Pestaña de pruebas de Intel dentro de Inventario.
 *
 * Sube varias fotos, crea compras reales y muestra el resultado del worker.
 * Sirve para cargar lotes de tickets sin pasar por el flujo individual de
 * Compras; la revisión y aprobación siguen viviendo en `/purchases/[id]`.
 */
export function IntelTicketsTab() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<UploadRow[]>([])
  const [recent, setRecent] = useState<PurchaseListItem[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)

  function updateRow(id: string, patch: Partial<UploadRow>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    )
  }

  function syncRows(tickets: PurchaseListItem[]) {
    setRows((current) => mergeTicketsIntoRows(current, tickets))
  }

  async function refreshRecent(): Promise<PurchaseListItem[]> {
    setLoadingRecent(true)
    const result = await getRecentTickets()
    setLoadingRecent(false)

    if (!result.ok || !result.data) {
      toast.error(result.message ?? "No pudimos cargar los tickets recientes")
      return []
    }

    setRecent(result.data)
    syncRows(result.data)
    return result.data
  }

  useEffect(() => {
    let cancelled = false

    void getRecentTickets().then((result) => {
      if (cancelled) return

      setLoadingRecent(false)

      if (!result.ok || !result.data) {
        toast.error(result.message ?? "No pudimos cargar los tickets recientes")
        return
      }

      const tickets = result.data
      setRecent(tickets)
      setRows((current) => mergeTicketsIntoRows(current, tickets))
    })

    return () => {
      cancelled = true
    }
  }, [])

  function addFiles(list: FileList | File[] | null) {
    const files = Array.from(list ?? [])
    if (files.length === 0) return

    const pendingCount = rows.filter((row) => row.status === "pending").length
    const accepted: UploadRow[] = []

    for (const file of files) {
      const error = validateFile(file)

      if (error) {
        toast.error(`${file.name}: ${error}`)
        continue
      }

      accepted.push({
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${accepted.length}`,
        file,
        status: "pending",
      })
    }

    if (accepted.length === 0) return

    if (pendingCount + accepted.length > MAX_FILES) {
      toast.error(`Puedes cargar hasta ${MAX_FILES} imágenes por lote`)
      return
    }

    setRows((current) => [...current, ...accepted])

    if (inputRef.current) inputRef.current.value = ""
  }

  async function waitForProcessing(ids: string[]) {
    const pending = new Set(ids)

    for (let attempt = 0; attempt < MAX_POLLS && pending.size > 0; attempt += 1) {
      await sleep(POLL_INTERVAL)

      const result = await getRecentTickets()
      if (!result.ok || !result.data) continue

      setRecent(result.data)
      syncRows(result.data)

      for (const id of [...pending]) {
        const ticket = result.data.find((candidate) => candidate.id === id)
        if (ticket && ticket.status !== "PROCESSING") pending.delete(id)
      }
    }

    if (pending.size > 0) {
      toast.warning(
        "Algunos tickets siguen en proceso; aparecerán en Compras al terminar."
      )
    }
  }

  async function uploadAll() {
    const pendingRows = rows.filter((row) => row.status === "pending")

    if (pendingRows.length === 0 || busy) return

    setBusy(true)
    const createdIds: string[] = []
    let failed = 0

    for (const row of pendingRows) {
      updateRow(row.id, { status: "uploading", message: undefined })

      try {
        const presign = await presignTicket(row.file.type, row.file.size)

        if (!presign.ok || !presign.data) {
          throw new Error(presign.message ?? "No pudimos firmar la subida")
        }

        const upload = await fetch(presign.data.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": row.file.type },
          body: row.file,
        })

        if (!upload.ok) {
          throw new Error("No pudimos subir la imagen a R2")
        }

        const created = await createTicket({
          documentKey: presign.data.key,
          documentMime: row.file.type,
        })

        if (!created.ok || !created.data) {
          throw new Error(created.message ?? "No pudimos registrar el ticket")
        }

        updateRow(row.id, {
          status: "processing",
          purchaseId: created.data.id,
        })
        createdIds.push(created.data.id)
      } catch (error) {
        failed += 1
        updateRow(row.id, {
          status: "error",
          message:
            error instanceof Error ? error.message : "No pudimos subir el ticket",
        })
      }
    }

    await refreshRecent()

    if (createdIds.length > 0) {
      await waitForProcessing(createdIds)
    }

    setBusy(false)

    if (createdIds.length > 0) {
      toast.success(
        `${createdIds.length} ticket(s) enviados al worker${
          failed > 0 ? `; ${failed} fallaron` : ""
        }`
      )
    } else {
      toast.error("No se pudo enviar ningún ticket")
    }
  }

  const pending = rows.filter((row) => row.status === "pending").length
  const processing = rows.filter(
    (row) => row.status === "uploading" || row.status === "processing"
  ).length
  const done = rows.filter((row) => row.status === "done").length
  const errors = rows.filter((row) => row.status === "error").length

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              <ReceiptTextIcon className="size-4" />
              Tickets de prueba
              <Badge variant="secondary" size="sm">
                Intel
              </Badge>
            </CardTitle>
            <CardDescription>
              Sube fotos de tickets para probar la extracción del worker. Se
              crean compras reales; revísalas o recházalas en Compras.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" render={<Link href="/purchases" />}>
            Ir a Compras
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => addFiles(event.target.files)}
        />

        <div
          role="button"
          tabIndex={0}
          aria-label="Cargar fotos de tickets"
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors",
            dragging && "border-primary bg-primary/5",
            busy && "pointer-events-none opacity-60"
          )}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              inputRef.current?.click()
            }
          }}
          onDragOver={(event) => {
            event.preventDefault()
            if (!busy) setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            if (!busy) addFiles(event.dataTransfer.files)
          }}
        >
          <ImagePlusIcon className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">
            Arrastra las fotos o haz clic para elegirlas
          </p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG o WebP · máximo 10 MB · hasta {MAX_FILES} imágenes
          </p>
        </div>

        {rows.length > 0 ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => void uploadAll()}
                disabled={busy || pending === 0}
              >
                {busy ? (
                  <Loader2Icon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <UploadIcon data-icon="inline-start" />
                )}
                Subir {pending > 0 ? `${pending} ticket(s)` : "tickets"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => setRows([])}
              >
                Limpiar lista
              </Button>
              <span className="text-xs text-muted-foreground">
                {done} listos · {processing} en proceso · {errors} con error
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Archivo</th>
                    <th className="px-3 py-2 font-medium">Estado</th>
                    <th className="px-3 py-2 font-medium">Resultado</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t align-top">
                      <td className="max-w-64 truncate px-3 py-2">
                        {row.file.name}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={rowVariant(row.status)}>
                          {row.status === "processing" || row.status === "uploading" ? (
                            <Loader2Icon className="animate-spin" data-icon="inline-start" />
                          ) : row.status === "done" ? (
                            <CheckCircle2Icon data-icon="inline-start" />
                          ) : row.status === "error" ? (
                            <TriangleAlertIcon data-icon="inline-start" />
                          ) : null}
                          {rowLabel(row.status)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.status === "processing"
                          ? "La IA está leyendo la foto…"
                          : row.status === "error"
                            ? row.message
                            : row.supplier
                              ? `${row.supplier} · $${Number(row.total ?? 0).toFixed(2)} · ${row.lines ?? 0} línea(s)`
                              : row.status === "pending"
                                ? "Listo para subir"
                                : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          {row.purchaseId ? (
                            <Button
                              variant="ghost"
                              size="xs"
                              render={
                                <Link href={`/purchases/${row.purchaseId}`} />
                              }
                            >
                              Revisar
                            </Button>
                          ) : null}
                          {row.status === "pending" || row.status === "error" ? (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              disabled={busy}
                              onClick={() =>
                                setRows((current) =>
                                  current.filter((item) => item.id !== row.id)
                                )
                              }
                              aria-label="Quitar imagen"
                            >
                              <XIcon />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Tickets recientes</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loadingRecent || busy}
            onClick={() => void refreshRecent()}
          >
            {loadingRecent ? (
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
            ) : (
              <RefreshCwIcon data-icon="inline-start" />
            )}
            Actualizar
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Proveedor / folio</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 text-right font-medium">Líneas</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {recent.slice(0, 50).map((ticket) => (
                <tr key={ticket.id} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                    {formatDate(ticket.purchasedAt)}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-medium">
                      {ticket.supplier?.name ?? "Sin proveedor"}
                    </span>
                    {ticket.folio ? (
                      <span className="block text-xs text-muted-foreground">
                        {ticket.folio}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    ${Number(ticket.total).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {ticket._count.items}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={purchaseStatusVariant(ticket.status)}>
                      {purchaseStatusLabel(ticket.status)}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/purchases/${ticket.id}`}
                      className="text-sm underline underline-offset-4"
                    >
                      Revisar
                    </Link>
                  </td>
                </tr>
              ))}
              {!loadingRecent && recent.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-sm text-muted-foreground"
                  >
                    Aún no hay tickets. Sube las primeras fotos arriba.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          {loadingRecent ? (
            <p className="px-3 py-3 text-center text-xs text-muted-foreground">
              Cargando tickets recientes…
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
