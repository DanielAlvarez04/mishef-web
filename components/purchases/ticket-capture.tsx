"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CameraIcon, ImagePlusIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import {
  createTicket,
  extractTicket,
  presignTicket,
} from "@/app/(app)/purchases/actions"
import { useOfflineSync } from "@/components/offline/offline-provider"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

const MAX_TICKET_BYTES = 10 * 1024 * 1024
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"])

type Phase = "idle" | "uploading" | "reading"

const PHASE_LABEL: Record<Phase, string> = {
  idle: "Subir ticket",
  uploading: "Subiendo foto…",
  reading: "Leyendo el ticket con IA…",
}

function validate(file: File): string | null {
  if (!ACCEPTED.has(file.type)) {
    return "Formato no admitido. Usa JPG, PNG o WebP."
  }

  if (file.size === 0) return "La foto está vacía."

  if (file.size > MAX_TICKET_BYTES) {
    return "La foto supera el máximo de 10 MB."
  }

  return null
}

/**
 * Captura de tickets: cámara del teléfono o galería.
 *
 * La foto se sube directo a R2 con una URL firmada; la API solo guarda la
 * clave. Después se dispara la extracción con visión y se abre la revisión.
 */
export function TicketCapture() {
  const router = useRouter()
  const { isOnline, enqueueTicket } = useOfflineSync()
  const [pending, startTransition] = useTransition()
  const [phase, setPhase] = useState<Phase>("idle")
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const busy = pending || phase !== "idle"

  function pick(selected: File | null | undefined) {
    if (!selected) return

    const error = validate(selected)
    if (error) {
      toast.error(error)
      return
    }

    setFile(selected)
  }

  function reset() {
    setFile(null)
    setPhase("idle")

    if (cameraRef.current) cameraRef.current.value = ""
    if (galleryRef.current) galleryRef.current.value = ""
  }

  async function saveOffline() {
    if (!file) return

    await enqueueTicket({
      file,
      fileName: file.name,
      mimeType: file.type || "image/jpeg",
    })

    toast.info("Ticket guardado en este dispositivo", {
      description:
        "Se enviará y leerá automáticamente cuando vuelva la conexión.",
    })
    reset()
  }

  function submit() {
    if (!file) {
      toast.error("Toma o elige una foto del ticket")
      return
    }

    if (!isOnline) {
      void saveOffline()
      return
    }

    startTransition(async () => {
      try {
        setPhase("uploading")

        const presign = await presignTicket(file.type, file.size)

        if (!presign.ok || !presign.data) {
          if (presign.network) {
            await saveOffline()
            return
          }

          toast.error(presign.message ?? "No pudimos preparar la foto")
          return
        }

        const upload = await fetch(presign.data.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        }).catch(() => null)

        if (!upload?.ok) {
          await saveOffline()
          return
        }

        const created = await createTicket({
          documentKey: presign.data.key,
          documentMime: file.type,
        })

        if (!created.ok || !created.data) {
          if (created.network) {
            await saveOffline()
            return
          }

          toast.error(created.message ?? "No pudimos registrar el ticket")
          return
        }

        setPhase("reading")
        toast.info("Leyendo el ticket con IA. Puede tardar unos segundos…")

        const extracted = await extractTicket(created.data.id)

        if (!extracted.ok) {
          toast.warning(
            extracted.message ??
              "No se pudo leer el ticket. Captura las líneas a mano."
          )
        } else {
          toast.success("Ticket leído. Revisa las líneas antes de aprobar.")
        }

        router.push(`/purchases/${created.data.id}`)
        router.refresh()
      } finally {
        setPhase("idle")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuevo ticket de compra</CardTitle>
        <CardDescription>
          Toma una foto clara del ticket completo. La IA propone proveedor,
          fecha, total y líneas; tú confirmas antes de mover el inventario.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <input
          ref={cameraRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(event) => pick(event.target.files?.[0])}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => pick(event.target.files?.[0])}
        />

        <div
          className={cn(
            "flex flex-col gap-4 rounded-xl border border-dashed p-3 transition-colors",
            dragging && "border-primary bg-primary/5"
          )}
          onDragOver={(event) => {
            event.preventDefault()
            if (!busy) setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)

            if (busy) return

            pick(event.dataTransfer.files?.[0])
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => cameraRef.current?.click()}
            >
              <CameraIcon data-icon="inline-start" />
              Tomar foto
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => galleryRef.current?.click()}
            >
              <ImagePlusIcon data-icon="inline-start" />
              Elegir de galería
            </Button>
            <span className="text-xs text-muted-foreground">
              o arrastra la foto aquí
            </span>
          </div>

          {file ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-2 text-sm">
              <span className="min-w-0 truncate">
                {file.name}{" "}
                <span className="text-muted-foreground">
                  ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={reset}
              >
                Quitar
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            JPG, PNG o WebP · máximo 10 MB
          </p>
          <Button type="button" disabled={busy || !file} onClick={submit}>
            {busy ? (
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
            ) : null}
            {busy ? PHASE_LABEL[phase] : PHASE_LABEL.idle}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
