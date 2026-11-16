import Link from "next/link"
import { GalleryVerticalEndIcon } from "lucide-react"

import { brandStyle } from "@/lib/brand"

/**
 * Marco visual compartido por las pantallas de autenticación:
 * panel de formulario + panel con el degradado del tema.
 *
 * Acepta la marca del negocio para que un subdominio se sienta suyo: color
 * primario, logo y nombre.
 */
export function AuthShell({
  children,
  name = "Mishef",
  color,
  logoUrl,
}: {
  children: React.ReactNode
  /** Nombre visible del negocio (marca blanca en subdominios). */
  name?: string
  /** Color primario `#rrggbb`. */
  color?: string | null
  /** Logo público del negocio. */
  logoUrl?: string | null
}) {
  return (
    <div
      className="grid h-svh overflow-y-auto lg:grid-cols-2"
      style={brandStyle(color)}
    >
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <Link
          href="/login"
          className="flex justify-center gap-2 font-medium md:justify-start"
        >
          {logoUrl ? (
            // El logo viene de R2 (dominio propio del bucket); no hace falta el
            // optimizador de Next para un icono de 24 px.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="size-6 rounded-md object-cover"
            />
          ) : (
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEndIcon className="size-4" />
            </div>
          )}
          {name}
        </Link>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary/85 to-secondary lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_15%,var(--primary-foreground),transparent_45%)] opacity-25" />
        <div className="absolute -top-40 -right-32 size-[30rem] rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 size-[26rem] rounded-full bg-background/20 blur-3xl" />
      </div>
    </div>
  )
}
