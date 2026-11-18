/** Tokens visuales globales editados desde `/styles`. */

import { resolveColor } from "./tailwind-colors"

export interface ButtonVariantTokens {
  bg: string
  fg: string
  border: string
  hoverBg: string
  activeBg: string
  radius: number
  borderWidth: number
}

export type ButtonVariant = "main" | "secondary" | "outline" | "ghost"
export type ButtonTokens = Record<ButtonVariant, ButtonVariantTokens>

export interface ChipVariantTokens {
  bg: string
  fg: string
  border: string
  hoverBg: string
  radius: number
  borderWidth: number
}

export type ChipVariant = "main" | "secondary" | "outline" | "ghost"
export type ChipTokens = Record<ChipVariant, ChipVariantTokens>

export interface TabsTokens {
  activeBg: string
  activeFg: string
  inactiveFg: string
  hoverFg: string
  radius: number
}

/** Fondos del armazón, con variante para tema claro y oscuro. */
export interface SurfaceStyleTokens {
  sidebarLight: string
  sidebarDark: string
  mainLight: string
  mainDark: string
}

export interface DesignTokens {
  buttons: ButtonTokens
  chips: ChipTokens
  tabs: TabsTokens
  surfaces: SurfaceStyleTokens
}

export const BUTTON_VARIANTS: Array<{
  key: ButtonVariant
  label: string
  dataVariant: string
}> = [
  { key: "main", label: "Main", dataVariant: "default" },
  { key: "secondary", label: "Secondary", dataVariant: "secondary" },
  { key: "outline", label: "Outline", dataVariant: "outline" },
  { key: "ghost", label: "Ghost", dataVariant: "ghost" },
]

export const CHIP_VARIANTS: Array<{
  key: ChipVariant
  label: string
  dataVariant: string
}> = [
  { key: "main", label: "Main", dataVariant: "default" },
  { key: "secondary", label: "Secondary", dataVariant: "secondary" },
  { key: "outline", label: "Outline", dataVariant: "outline" },
  { key: "ghost", label: "Ghost", dataVariant: "ghost" },
]

function buttonVariant(
  bg: string,
  fg: string,
  border: string,
  hoverBg: string,
  activeBg: string,
  borderWidth: number
): ButtonVariantTokens {
  return { bg, fg, border, hoverBg, activeBg, radius: 8, borderWidth }
}

function chipVariant(
  bg: string,
  fg: string,
  border: string,
  hoverBg: string,
  borderWidth: number
): ChipVariantTokens {
  return { bg, fg, border, hoverBg, radius: 9999, borderWidth }
}

/** Valores iniciales del laboratorio (no se aplican hasta publicar). */
export const DEFAULT_DESIGN_TOKENS: DesignTokens = {
  buttons: {
    main: buttonVariant(
      "orange-600",
      "white",
      "orange-600",
      "orange-700",
      "orange-800",
      0
    ),
    secondary: buttonVariant(
      "neutral-100",
      "neutral-900",
      "neutral-200",
      "neutral-200",
      "neutral-300",
      1
    ),
    outline: buttonVariant(
      "transparent",
      "neutral-900",
      "neutral-300",
      "neutral-100",
      "neutral-200",
      1
    ),
    ghost: buttonVariant(
      "transparent",
      "neutral-700",
      "transparent",
      "neutral-100",
      "neutral-200",
      0
    ),
  },
  chips: {
    main: chipVariant("orange-600", "white", "orange-600", "orange-700", 0),
    secondary: chipVariant(
      "neutral-100",
      "neutral-900",
      "neutral-200",
      "neutral-200",
      1
    ),
    outline: chipVariant(
      "transparent",
      "neutral-900",
      "neutral-300",
      "neutral-100",
      1
    ),
    ghost: chipVariant(
      "transparent",
      "neutral-700",
      "transparent",
      "neutral-100",
      0
    ),
  },
  tabs: {
    activeBg: "white",
    activeFg: "neutral-900",
    inactiveFg: "neutral-500",
    hoverFg: "neutral-900",
    radius: 8,
  },
  surfaces: {
    sidebarLight: "neutral-100",
    sidebarDark: "neutral-950",
    mainLight: "white",
    mainDark: "neutral-900",
  },
}

const TOKEN = /^[a-z]+-\d{2,3}$/
const SPECIAL = new Set(["white", "black", "transparent"])

function isColor(value: unknown): value is string {
  return typeof value === "string" && (TOKEN.test(value) || SPECIAL.has(value))
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isButtonVariant(value: unknown): value is ButtonVariantTokens {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>

  return (
    isColor(item.bg) &&
    isColor(item.fg) &&
    isColor(item.border) &&
    isColor(item.hoverBg) &&
    isColor(item.activeBg) &&
    isNumber(item.radius) &&
    isNumber(item.borderWidth)
  )
}

function isChipVariant(value: unknown): value is ChipVariantTokens {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>

  return (
    isColor(item.bg) &&
    isColor(item.fg) &&
    isColor(item.border) &&
    isColor(item.hoverBg) &&
    isNumber(item.radius) &&
    isNumber(item.borderWidth)
  )
}

function isTabs(value: unknown): value is TabsTokens {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>

  return (
    isColor(item.activeBg) &&
    isColor(item.activeFg) &&
    isColor(item.inactiveFg) &&
    isColor(item.hoverFg) &&
    isNumber(item.radius)
  )
}

function isSurfaces(value: unknown): value is SurfaceStyleTokens {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>

  return (
    isColor(item.sidebarLight) &&
    isColor(item.sidebarDark) &&
    isColor(item.mainLight) &&
    isColor(item.mainDark)
  )
}

function validButtonSet(value: unknown): value is ButtonTokens {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>

  return BUTTON_VARIANTS.every((variant) => isButtonVariant(item[variant.key]))
}

function validChipSet(value: unknown): value is ChipTokens {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>

  return CHIP_VARIANTS.every((variant) => isChipVariant(item[variant.key]))
}

/** Valida lo que llega de la API antes de inyectarlo como CSS. */
export function normalizeDesignTokens(value: unknown): DesignTokens | null {
  if (!value || typeof value !== "object") return null
  const item = value as Record<string, unknown>

  return {
    buttons: validButtonSet(item.buttons)
      ? item.buttons
      : DEFAULT_DESIGN_TOKENS.buttons,
    chips: validChipSet(item.chips)
      ? item.chips
      : DEFAULT_DESIGN_TOKENS.chips,
    tabs: isTabs(item.tabs) ? item.tabs : DEFAULT_DESIGN_TOKENS.tabs,
    surfaces: isSurfaces(item.surfaces)
      ? item.surfaces
      : DEFAULT_DESIGN_TOKENS.surfaces,
  }
}

function color(token: string): string {
  return resolveColor(token)
}

function buttonVariantCss(
  selector: string,
  tokens: ButtonVariantTokens
): string {
  return `${selector} {
  background-color: ${color(tokens.bg)} !important;
  color: ${color(tokens.fg)} !important;
  border-color: ${color(tokens.border)} !important;
  border-width: ${tokens.borderWidth}px !important;
  border-style: solid !important;
  border-radius: ${tokens.radius}px !important;
}
${selector}:hover {
  background-color: ${color(tokens.hoverBg)} !important;
}
${selector}:active {
  background-color: ${color(tokens.activeBg)} !important;
}`
}

function chipVariantCss(selector: string, tokens: ChipVariantTokens): string {
  return `${selector} {
  background-color: ${color(tokens.bg)} !important;
  color: ${color(tokens.fg)} !important;
  border-color: ${color(tokens.border)} !important;
  border-width: ${tokens.borderWidth}px !important;
  border-style: solid !important;
  border-radius: ${tokens.radius}px !important;
}
${selector}:hover {
  background-color: ${color(tokens.hoverBg)} !important;
}`
}

/** CSS que aplica los tokens a los componentes de toda la app. */
export function designCss(tokens: DesignTokens): string {
  const { buttons, chips, tabs, surfaces } = tokens

  const buttonRules = BUTTON_VARIANTS.map((variant) =>
    buttonVariantCss(
      `[data-slot="button"][data-variant="${variant.dataVariant}"]`,
      buttons[variant.key]
    )
  ).join("\n")

  const chipRules = CHIP_VARIANTS.map((variant) =>
    chipVariantCss(
      `[data-slot="badge"][data-variant="${variant.dataVariant}"]`,
      chips[variant.key]
    )
  ).join("\n")

  return `
${buttonRules}
${chipRules}
[data-slot="tabs-trigger"] {
  color: ${color(tabs.inactiveFg)} !important;
  border-radius: ${tabs.radius}px !important;
}
[data-slot="tabs-trigger"]:hover {
  color: ${color(tabs.hoverFg)} !important;
}
[data-slot="tabs-trigger"][data-active] {
  background-color: ${color(tabs.activeBg)} !important;
  color: ${color(tabs.activeFg)} !important;
}
[data-slot="sidebar-wrapper"] {
  background-color: ${color(surfaces.sidebarLight)} !important;
}
[data-slot="sidebar-inset"] {
  background-color: ${color(surfaces.mainLight)} !important;
}
.dark [data-slot="sidebar-wrapper"] {
  background-color: ${color(surfaces.sidebarDark)} !important;
}
.dark [data-slot="sidebar-inset"] {
  background-color: ${color(surfaces.mainDark)} !important;
}
`.trim()
}

/** Correos con permiso para guardar/aplicar estilos además del platform admin. */
export const DESIGN_EDITOR_EMAILS = ["portafolio.d.alvarez@gmail.com"]

export function canEditStyles(user: {
  email: string | null
  isPlatformAdmin: boolean
}): boolean {
  if (user.isPlatformAdmin) return true

  const email = user.email?.toLowerCase()
  return Boolean(email && DESIGN_EDITOR_EMAILS.includes(email))
}
