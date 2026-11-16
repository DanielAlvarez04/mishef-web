"use client"

import * as React from "react"

import { formatMoney, type MoneyFormatter } from "./catalog"

export type { MoneyFormatter } from "./catalog"
export type { SupportedCurrency } from "./currency-config"

/**
 * Moneda de la organización activa.
 *
 * Es un contexto de React (no estado global de módulo) para que la app sea
 * multiinquilino: cada render usa la moneda de su propia organización.
 */
const CurrencyContext = React.createContext<string | null>(null)

export function CurrencyProvider({
  currency,
  children,
}: {
  currency: string
  children: React.ReactNode
}) {
  return (
    <CurrencyContext.Provider value={currency}>
      {children}
    </CurrencyContext.Provider>
  )
}

/** Moneda configurada; `MXN` si el componente se renderiza sin provider. */
export function useCurrency(): string {
  return React.useContext(CurrencyContext) ?? "MXN"
}

/**
 * Formateador de importes ligado a la moneda de la organización.
 *
 * Devuelve una función estable mientras la moneda no cambie, con el formato
 * `MXN 500.00` / `USD 500.00`.
 */
export function useMoney(): MoneyFormatter {
  const currency = useCurrency()

  return React.useCallback(
    (value: string | number) => formatMoney(value, currency),
    [currency]
  )
}
