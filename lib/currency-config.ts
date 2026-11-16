/**
 * Monedas configurables por organización (código ISO 4217).
 *
 * Módulo sin `"use client"` para poder usarlo tanto en componentes cliente
 * como en Server Actions. La API valida la misma allowlist.
 */
export const SUPPORTED_CURRENCIES = ["MXN", "USD"] as const

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

export const CURRENCY_OPTIONS: Array<{
  value: SupportedCurrency
  label: string
}> = [
  { value: "MXN", label: "MXN — Peso mexicano" },
  { value: "USD", label: "USD — Dólar estadounidense" },
]

export function isSupportedCurrency(
  value: string | null | undefined
): value is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(value as SupportedCurrency)
}
