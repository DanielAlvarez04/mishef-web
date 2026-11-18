export type MediaEntityType = "ITEM" | "RECIPE" | "INGREDIENT" | "MENU"
export type MediaKind = "IMAGE" | "VIDEO"

export interface MediaAsset {
  id: string
  entityType: MediaEntityType
  entityId: string
  kind: MediaKind
  url: string
  name: string | null
  mimeType: string | null
  sizeBytes: number | null
  createdAt: string
}

export interface MediaGalleryData {
  assets: MediaAsset[]
  limits: {
    maxImages: number
    maxVideos: number
  }
  usage: {
    images: number
    videos: number
  }
  primaryImageCount: number
}

export interface PresignedMedia {
  uploadUrl: string
  key: string
  contentType: string
  kind: MediaKind
}
