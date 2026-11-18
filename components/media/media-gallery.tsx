"use client"

import * as React from "react"
import {
  FilmIcon,
  ImageIcon,
  Loader2Icon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  finalizeMedia,
  getMediaGallery,
  presignMedia,
  removeMedia,
} from "@/lib/media-actions"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { EntityImage } from "@/components/ui/entity-image"
import type {
  MediaAsset,
  MediaEntityType,
  MediaGalleryData,
} from "@/lib/media"

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]
const IMAGE_MAX = 5 * 1024 * 1024
const VIDEO_MAX = 50 * 1024 * 1024

function formatBytes(value: number | null): string {
  if (!value) return "—"
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`
  return `${Math.round(value / 1024)} KB`
}

/**
 * Galería de imágenes y videos por entidad.
 *
 * Los archivos se suben directo a R2 con una URL firmada; la API valida el
 * tamaño real y aplica los límites del plan antes de guardar la fila.
 */
export function MediaGallery({
  entityType,
  entityId,
  disabled = false,
  title = "Galería",
  description,
}: {
  entityType: MediaEntityType
  entityId: string
  disabled?: boolean
  title?: string
  description?: string
}) {
  const [data, setData] = React.useState<MediaGalleryData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [uploading, setUploading] = React.useState(false)
  const [target, setTarget] = React.useState<MediaAsset | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const reload = React.useCallback(async () => {
    const result = await getMediaGallery(entityType, entityId)

    if (!result.ok || !result.data) {
      toast.error(result.message ?? "No pudimos cargar la galería")
      setLoading(false)
      return
    }

    setData(result.data)
    setLoading(false)
  }, [entityId, entityType])

  React.useEffect(() => {
    let cancelled = false

    void getMediaGallery(entityType, entityId).then((result) => {
      if (cancelled) return

      if (!result.ok || !result.data) {
        toast.error(result.message ?? "No pudimos cargar la galería")
        setLoading(false)
        return
      }

      setData(result.data)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [entityId, entityType])

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return

    if (!data) {
      toast.error("La galería todavía no está lista")
      return
    }

    setUploading(true)

    try {
      for (const file of Array.from(files)) {
        const kind = file.type.startsWith("video/") ? "VIDEO" : "IMAGE"
        const allowed = kind === "VIDEO" ? VIDEO_TYPES : IMAGE_TYPES

        if (!allowed.includes(file.type)) {
          toast.error(`${file.name}: formato no permitido`)
          continue
        }

        if (kind === "IMAGE" && file.size > IMAGE_MAX) {
          toast.error(`${file.name}: la imagen supera 5 MB`)
          continue
        }

        if (kind === "VIDEO" && file.size > VIDEO_MAX) {
          toast.error(`${file.name}: el video supera 50 MB`)
          continue
        }

        const presigned = await presignMedia({
          entityType,
          entityId,
          kind,
          contentType: file.type,
          size: file.size,
          name: file.name,
        })

        if (!presigned.ok || !presigned.data) {
          toast.error(presigned.message ?? `No se pudo preparar ${file.name}`)
          continue
        }

        const uploaded = await fetch(presigned.data.uploadUrl, {
          method: "PUT",
          headers: { "content-type": file.type },
          body: file,
        })

        if (!uploaded.ok) {
          toast.error(`${file.name}: falló la subida a R2`)
          continue
        }

        const finalized = await finalizeMedia({
          entityType,
          entityId,
          kind,
          contentType: file.type,
          key: presigned.data.key,
          name: file.name,
        })

        if (!finalized.ok) {
          toast.error(finalized.message ?? `No se pudo guardar ${file.name}`)
        }
      }

      await reload()
      toast.success("Galería actualizada")
    } finally {
      setUploading(false)
    }
  }

  async function remove() {
    if (!target) return

    const result = await removeMedia(target.id)

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo eliminar el archivo")
    } else {
      toast.success("Archivo eliminado")
      setTarget(null)
      await reload()
    }
  }

  const maxImages = data?.limits.maxImages ?? 1
  const maxVideos = data?.limits.maxVideos ?? 0
  const images = data?.usage.images ?? 0
  const videos = data?.usage.videos ?? 0
  const full = images >= maxImages && videos >= maxVideos

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="size-4" /> {title}
          {data ? (
            <span className="ml-auto flex gap-1">
              <Badge variant={images >= maxImages ? "destructive" : "outline"}>
                {images}/{maxImages} imágenes
              </Badge>
              <Badge variant={videos >= maxVideos ? "destructive" : "outline"}>
                {videos}/{maxVideos} videos
              </Badge>
            </span>
          ) : null}
        </CardTitle>
        <CardDescription>
          {description ??
            "Imágenes adicionales y video. Los archivos se guardan en R2 y cuentan para el almacenamiento del negocio."}
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-3">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" /> Cargando galería…
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {(data?.assets ?? []).map((asset) => (
                <div
                  key={asset.id}
                  className="group relative overflow-hidden rounded-lg border bg-muted"
                >
                  {asset.kind === "IMAGE" ? (
                    <EntityImage
                      src={asset.url}
                      alt={asset.name ?? "Imagen"}
                      sizes="200px"
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <video
                      src={asset.url}
                      controls
                      preload="metadata"
                      className="aspect-square w-full bg-black object-cover"
                    />
                  )}
                  <div className="absolute top-1 right-1">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="destructive"
                      aria-label="Eliminar archivo"
                      onClick={() => setTarget(asset)}
                      disabled={disabled || uploading}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                  <span className="absolute bottom-0 left-0 flex w-full items-center gap-1 bg-background/80 px-1.5 py-1 text-[10px] backdrop-blur">
                    {asset.kind === "VIDEO" ? (
                      <FilmIcon className="size-3" />
                    ) : (
                      <ImageIcon className="size-3" />
                    )}
                    <span className="truncate">{asset.name ?? "Archivo"}</span>
                    <span className="ml-auto shrink-0 text-muted-foreground">
                      {formatBytes(asset.sizeBytes)}
                    </span>
                  </span>
                </div>
              ))}
              {data?.assets.length === 0 ? (
                <p className="col-span-full rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Todavía no hay imágenes adicionales ni video.
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={disabled || uploading || full}
              >
                {uploading ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <UploadIcon />
                )}
                Agregar imágenes o video
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(",")}
                multiple
                className="sr-only"
                onChange={(event) => {
                  void uploadFiles(event.target.files)
                  event.target.value = ""
                }}
              />
              <p className="text-xs text-muted-foreground">
                {full
                  ? "Alcanzaste el límite de tu plan."
                  : "JPG/PNG/WebP hasta 5 MB · MP4/WebM/MOV hasta 50 MB"}
              </p>
            </div>
          </>
        )}
      </CardContent>

      <AlertDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null)
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrará de R2 y dejará de ocupar espacio en tu plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void remove()}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
