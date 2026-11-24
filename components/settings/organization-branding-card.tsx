"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Loader2Icon, MapPinIcon, PaletteIcon, RotateCcwIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import {
  removeOrganizationLogo,
  searchOrganizationLocation,
  updateOrganizationBranding,
  type LocationSearchResult,
} from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ImageDropzone } from "@/components/catalog/image-dropzone"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { sameText } from "@/lib/diff"
import { uploadOrganizationLogo } from "@/lib/uploads"
import { ORGANIZATION_THEMES } from "@/lib/themes"

export interface OrganizationBrandingProps {
  brandColor: string | null
  theme: string
  logoUrl: string | null
  address: string | null
  latitude: string | null
  longitude: string | null
  canManage: boolean
}

/**
 * Marca blanca y ubicación del negocio.
 *
 * La ubicación usa coordenadas reales: se pueden pegar a mano o capturar con
 * el GPS del dispositivo, que es lo que un dueño hace en la puerta del local.
 */
export function OrganizationBrandingCard({
  brandColor,
  theme: initialTheme,
  logoUrl,
  address,
  latitude,
  longitude,
  canManage,
}: OrganizationBrandingProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [color, setColor] = useState(brandColor ?? "")
  const [theme, setTheme] = useState(initialTheme)
  const [logoPreview, setLogoPreview] = useState(logoUrl ?? null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [place, setPlace] = useState(address ?? "")
  const [lat, setLat] = useState(latitude ?? "")
  const [lng, setLng] = useState(longitude ?? "")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<LocationSearchResult[]>([])
  const [searching, startSearch] = useTransition()

  if (!canManage) return null

  const mapSrc = (() => {
    const latitude = Number(lat)
    const longitude = Number(lng)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null

    const delta = 0.004
    const bbox = [
      longitude - delta,
      latitude - delta,
      longitude + delta,
      latitude + delta,
    ].join(",")

    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`
  })()

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Este dispositivo no permite obtener la ubicación.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(7))
        setLng(position.coords.longitude.toFixed(7))
        toast.success("Ubicación capturada. Guarda para aplicarla.")
      },
      () => toast.error("No pudimos obtener tu ubicación."),
      { enableHighAccuracy: true, timeout: 10_000 }
    )
  }

  function searchAddress() {
    const value = query.trim()

    if (value.length < 3) {
      toast.error("Escribe al menos 3 caracteres.")
      return
    }

    startSearch(async () => {
      const result = await searchOrganizationLocation(value)

      if (!result.ok) {
        toast.error(result.message ?? "No pudimos buscar la dirección.")
        return
      }

      setResults(result.data ?? [])

      if ((result.data ?? []).length === 0) {
        toast.info("No encontramos esa dirección. Prueba con calle, colonia y ciudad.")
      }
    })
  }

  function selectResult(result: LocationSearchResult) {
    setPlace(result.label)
    setLat(result.latitude.toFixed(7))
    setLng(result.longitude.toFixed(7))
    setResults([])
    setQuery("")
    toast.success("Dirección seleccionada. Guarda para aplicarla.")
  }

  async function handleLogoSelect(file: File) {
    const previous = logoPreview
    const localPreview = URL.createObjectURL(file)

    setLogoPreview(localPreview)
    setLogoUploading(true)

    try {
      const result = await uploadOrganizationLogo(file)

      if (!result.ok || !result.data) {
        setLogoPreview(previous)
        toast.error(result.message ?? "No se pudo subir el logo.")
        return
      }

      setLogoPreview(result.data.logoUrl)
      toast.success("Logo actualizado")
      router.refresh()
    } finally {
      URL.revokeObjectURL(localPreview)
      setLogoUploading(false)
    }
  }

  async function handleLogoRemove() {
    if (!logoPreview) return

    setLogoUploading(true)

    try {
      const result = await removeOrganizationLogo()

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo quitar el logo.")
        return
      }

      setLogoPreview(null)
      toast.success("Logo eliminado")
      router.refresh()
    } finally {
      setLogoUploading(false)
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const patch: Parameters<typeof updateOrganizationBranding>[0] = {}

    if (!sameText(brandColor ?? "", color.trim())) {
      patch.brandColor = color.trim() || null
    }
    if (!sameText(initialTheme, theme)) {
      patch.theme = theme
    }
    if (!sameText(address ?? "", place.trim())) {
      patch.address = place.trim() || null
    }

    const nextLat = lat.trim()
    const nextLng = lng.trim()

    if (nextLat !== (latitude ?? "")) {
      patch.latitude = nextLat ? Number(nextLat) : null
    }
    if (nextLng !== (longitude ?? "")) {
      patch.longitude = nextLng ? Number(nextLng) : null
    }

    if (Object.keys(patch).length === 0) {
      toast.info("Sin cambios")
      return
    }

    startTransition(async () => {
      const result = await updateOrganizationBranding(patch)

      if (result.ok) {
        toast.success("Marca y ubicación actualizadas")
        router.refresh()
      } else {
        toast.error(result.message ?? "No pudimos guardar los cambios")
      }
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PaletteIcon className="size-4" /> Marca del negocio
          </CardTitle>
          <CardDescription>
            El color y el logo se aplican en el login, el panel y los correos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="brandColor">Color primario</FieldLabel>
            <div className="flex items-center gap-3">
              <input
                id="brandColor"
                type="color"
                value={color || "#e2703a"}
                onChange={(event) => setColor(event.target.value)}
                className="size-9 cursor-pointer rounded-md border border-input bg-transparent p-1"
              />
              <Input
                aria-label="Color en hexadecimal"
                value={color}
                placeholder="#e2703a"
                maxLength={7}
                onChange={(event) => setColor(event.target.value)}
                className="max-w-40"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setColor("")}
                disabled={!color}
              >
                <RotateCcwIcon />
                Restablecer
              </Button>
            </div>
            <FieldDescription>
              Se usa como color de acento en botones y estados. Déjalo vacío o
              pulsa «Restablecer» para volver a los colores de Mishef.
            </FieldDescription>
          </Field>

          <Field className="max-w-64">
            <FieldLabel htmlFor="organization-theme">Tema del panel</FieldLabel>
            <Select
              value={theme}
              onValueChange={(next) => {
                if (next) setTheme(next)
              }}
              items={[...ORGANIZATION_THEMES]}
              disabled={pending}
            >
              <SelectTrigger
                id="organization-theme"
                className="w-full"
                aria-label="Tema del panel"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORGANIZATION_THEMES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              Define los colores base del panel. El sidebar usa el fondo y el
              main el tono 100 del tema.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel>Logo del negocio</FieldLabel>
            <div className="max-w-sm">
              <ImageDropzone
                url={logoPreview}
                onSelect={(file) => void handleLogoSelect(file)}
                onRemove={() => void handleLogoRemove()}
                disabled={pending || logoUploading}
                title="Arrastra el logo o haz clic"
                description={
                  "JPG, PNG o WebP · máx. 5 MB\nSe recomienda horizontal (2:1)"
                }
                hint="Se usa en el panel, los correos y el ticket de la terminal."
                alt="Logo del negocio"
                fit="contain"
              />
            </div>
            {logoUploading ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2Icon className="size-3 animate-spin" />
                Subiendo y procesando…
              </p>
            ) : null}
            <FieldDescription>
              El logo se optimiza y se genera un JPEG especial para el ticket.
            </FieldDescription>
          </Field>

          <div className="flex flex-col gap-3 border-t pt-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <MapPinIcon className="size-4" /> Ubicación
            </p>

            <Field>
              <FieldLabel htmlFor="address">Dirección</FieldLabel>
              <Input
                id="address"
                value={place}
                placeholder="Av. Reforma 123, Col. Centro"
                maxLength={200}
                onChange={(event) => setPlace(event.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="location-search">
                Buscar en el mapa
              </FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="location-search"
                  value={query}
                  placeholder="Calle, colonia, ciudad…"
                  maxLength={120}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      searchAddress()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={searching || query.trim().length < 3}
                  onClick={searchAddress}
                >
                  {searching ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <SearchIcon />
                  )}
                  Buscar
                </Button>
              </div>
              <FieldDescription>
                Resultados de OpenStreetMap. Elige uno para fijar la dirección y
                las coordenadas reales.
              </FieldDescription>

              {results.length > 0 ? (
                <ul className="flex flex-col overflow-hidden rounded-md border">
                  {results.map((result) => (
                    <li key={`${result.latitude},${result.longitude}`}>
                      <button
                        type="button"
                        onClick={() => selectResult(result)}
                        className="flex w-full items-start gap-2 border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted"
                      >
                        <MapPinIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <span>{result.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Field>

            <div className="flex flex-wrap items-end gap-3">
              <Field className="w-40">
                <FieldLabel htmlFor="latitude">Latitud</FieldLabel>
                <Input
                  id="latitude"
                  value={lat}
                  placeholder="19.4326077"
                  inputMode="decimal"
                  onChange={(event) => setLat(event.target.value)}
                />
              </Field>
              <Field className="w-40">
                <FieldLabel htmlFor="longitude">Longitud</FieldLabel>
                <Input
                  id="longitude"
                  value={lng}
                  placeholder="-99.1332080"
                  inputMode="decimal"
                  onChange={(event) => setLng(event.target.value)}
                />
              </Field>
              <Button type="button" variant="outline" onClick={useMyLocation}>
                Usar mi ubicación
              </Button>
            </div>

            {mapSrc ? (
              <iframe
                title="Ubicación del negocio"
                src={mapSrc}
                loading="lazy"
                className="h-56 w-full rounded-lg border"
              />
            ) : null}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending || logoUploading}>
              {pending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
