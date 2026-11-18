/** Temas visuales disponibles para el panel. */

export const ORGANIZATION_THEMES = [
  { value: "default", label: "Predeterminado" },
] as const

export type OrganizationTheme = (typeof ORGANIZATION_THEMES)[number]["value"]

export function isOrganizationTheme(value: string): value is OrganizationTheme {
  return ORGANIZATION_THEMES.some((theme) => theme.value === value)
}
