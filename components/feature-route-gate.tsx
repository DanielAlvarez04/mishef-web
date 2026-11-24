"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { useFeatures } from "@/components/features-provider"
import {
  featureForPath,
  featureLabel,
  isFeatureEnabled,
} from "@/lib/features"

/**
 * Bloquea una página completa cuando su función está apagada.
 *
 * El layout del grupo `(app)` no se vuelve a ejecutar al navegar entre páginas,
 * así que la comprobación tiene que vivir en un componente cliente que escuche
 * `usePathname`. La API aplica la misma regla por su cuenta.
 */
export function FeatureRouteGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const features = useFeatures()
  const feature = pathname ? featureForPath(pathname) : null
  const blocked = feature ? !isFeatureEnabled(features, feature) : false

  if (!blocked) return <>{children}</>

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-2 px-4 py-16 text-center">
      <h1 className="text-lg font-semibold">Función no disponible</h1>
      <p className="text-sm text-muted-foreground">
        {feature ? `«${featureLabel(feature)}»` : "Esta función"} no está
        habilitada para este negocio. Pide a soporte que la active.
      </p>
    </div>
  )
}
