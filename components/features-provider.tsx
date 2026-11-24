"use client"

import * as React from "react"

import { isFeatureEnabled } from "@/lib/features"

const FeaturesContext = React.createContext<Record<string, boolean>>({})

/**
 * Funciones activas de la organización en el cliente.
 *
 * La navegación ya viene filtrada desde el servidor; este contexto sirve para
 * ocultar botones o acciones concretas con `<Can feature="...">`.
 */
export function FeaturesProvider({
  features,
  children,
}: {
  features: Record<string, boolean>
  children: React.ReactNode
}) {
  return (
    <FeaturesContext.Provider value={features}>
      {children}
    </FeaturesContext.Provider>
  )
}

export function useFeatures(): Record<string, boolean> {
  return React.useContext(FeaturesContext)
}

export function useFeature(key: string): boolean {
  const features = useFeatures()
  return isFeatureEnabled(features, key)
}

/** Renderiza los hijos solo si la función está activa. */
export function Can({
  feature,
  children,
  fallback = null,
}: {
  feature: string
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const enabled = useFeature(feature)
  return enabled ? children : fallback
}
