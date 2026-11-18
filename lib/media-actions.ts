"use server"

import { mutateApi, readApi, type ActionResult } from "@/lib/server-api"
import type {
  MediaAsset,
  MediaEntityType,
  MediaGalleryData,
  MediaKind,
  PresignedMedia,
} from "@/lib/media"

const PATHS = ["/catalog", "/inventory", "/menus"]

export async function getMediaGallery(
  entityType: MediaEntityType,
  entityId: string
): Promise<ActionResult<MediaGalleryData>> {
  return readApi<MediaGalleryData>(
    `/media?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`
  )
}

export async function presignMedia(input: {
  entityType: MediaEntityType
  entityId: string
  kind: MediaKind
  contentType: string
  size: number
  name?: string
}): Promise<ActionResult<PresignedMedia>> {
  return mutateApi<PresignedMedia>("/media/presign", "POST", input, PATHS)
}

export async function finalizeMedia(input: {
  entityType: MediaEntityType
  entityId: string
  kind: MediaKind
  contentType: string
  key: string
  name?: string
}): Promise<ActionResult<MediaAsset>> {
  return mutateApi<MediaAsset>("/media/finalize", "POST", input, PATHS)
}

export async function removeMedia(id: string): Promise<ActionResult> {
  return mutateApi(`/media/${id}`, "DELETE", undefined, PATHS)
}
