"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { MapPinIcon, PaletteIcon } from "lucide-react"
import { toast } from "sonner"

import { updateOrganizationBranding } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { sameText } from "@/lib/diff"

export interface OrganizationBrandingProps {
  brandColor: string | null
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
  logoUrl,
  address,
  latitude,
  longitude,
  canManage,
}: OrganizationBrandingProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [color, setColor] = useState(brandColor ?? "")
  const [logo, setLogo] = useState(logoUrl ?? "")
  const [place, setPlace] = useState(address ?? "")
  const [lat, setLat] = useState(latitude ?? "")
  const [lng, setLng] = useState(longitude ?? "")

  if (!canManage) return null

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

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const patch: Parameters<typeof updateOrganizationBranding>[0] = {}

    if (!sameText(brandColor ?? "", color.trim())) {
      patch.brandColor = color.trim() || null
    }
    if (!sameText(logoUrl ?? "", logo.trim())) {
      patch.logoUrl = logo.trim() || null
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
            </div>
            <FieldDescription>
              Se usa como color de acento en botones y estados.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="logoUrl">Logo (URL)</FieldLabel>
            <Input
              id="logoUrl"
              value={logo}
              placeholder="https://img.mishef.co/..."
              onChange={(event) => setLogo(event.target.value)}
            />
            <FieldDescription>
              Súbelo al catálogo de imágenes y pega aquí su URL pública.
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
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
