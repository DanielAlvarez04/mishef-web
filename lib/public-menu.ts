export interface PublicMenuItem {
  id: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  isSoldOut: boolean
}

export interface PublicMenuGroup {
  name: string
  items: PublicMenuItem[]
}

export interface PublicMenu {
  id: string
  name: string
  description: string | null
  groups: PublicMenuGroup[]
}

export interface PublicMenuResponse {
  organization: {
    name: string
    slug: string
    brandColor: string | null
    logoUrl: string | null
    address: string | null
  }
  menus: PublicMenu[]
}

const API =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001/v1"

/** Carga el menú público por slug o por dominio verificado. */
export async function fetchPublicMenu(params: {
  slug?: string | null
  host?: string | null
}): Promise<PublicMenuResponse | null> {
  const query = params.slug
    ? `slug=${encodeURIComponent(params.slug)}`
    : params.host
      ? `host=${encodeURIComponent(params.host)}`
      : ""

  if (!query) return null

  try {
    const response = await fetch(`${API}/public/menu?${query}`, {
      cache: "no-store",
    })

    if (!response.ok) return null

    return (await response.json()) as PublicMenuResponse
  } catch {
    return null
  }
}
