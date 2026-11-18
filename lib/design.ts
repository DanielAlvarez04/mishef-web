/** Tokens visuales globales editados desde `/styles`. */

export interface ButtonStyleTokens {
  bg: string
  fg: string
  hoverBg: string
  radius: number
  borderWidth: number
  borderColor: string
}

export interface BadgeStyleTokens {
  bg: string
  fg: string
  radius: number
  borderWidth: number
  borderColor: string
}

export interface TabsStyleTokens {
  activeBg: string
  activeFg: string
  inactiveFg: string
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
  button: ButtonStyleTokens
  badge: BadgeStyleTokens
  tabs: TabsStyleTokens
  surfaces: SurfaceStyleTokens
}

/** Valores iniciales del laboratorio (no se aplican hasta publicar). */
export const DEFAULT_DESIGN_TOKENS: DesignTokens = {
  button: {
    bg: "#e2703a",
    fg: "#ffffff",
    hoverBg: "#c95f2f",
    radius: 8,
    borderWidth: 0,
    borderColor: "#e2703a",
  },
  badge: {
    bg: "#e2703a",
    fg: "#ffffff",
    radius: 9999,
    borderWidth: 0,
    borderColor: "#e2703a",
  },
  tabs: {
    activeBg: "#ffffff",
    activeFg: "#1a1a1a",
    inactiveFg: "#6b7280",
    radius: 8,
  },
  surfaces: {
    sidebarLight: "#f7f7f5",
    sidebarDark: "#1c1c1a",
    mainLight: "#ffffff",
    mainDark: "#111110",
  },
}

const HEX = /^#[0-9a-fA-F]{6}$/

function isHex(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value)
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isButton(value: unknown): value is ButtonStyleTokens {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>

  return (
    isHex(item.bg) &&
    isHex(item.fg) &&
    isHex(item.hoverBg) &&
    isHex(item.borderColor) &&
    isNumber(item.radius) &&
    isNumber(item.borderWidth)
  )
}

function isBadge(value: unknown): value is BadgeStyleTokens {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>

  return (
    isHex(item.bg) &&
    isHex(item.fg) &&
    isHex(item.borderColor) &&
    isNumber(item.radius) &&
    isNumber(item.borderWidth)
  )
}

function isTabs(value: unknown): value is TabsStyleTokens {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>

  return (
    isHex(item.activeBg) &&
    isHex(item.activeFg) &&
    isHex(item.inactiveFg) &&
    isNumber(item.radius)
  )
}

function isSurfaces(value: unknown): value is SurfaceStyleTokens {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>

  return (
    isHex(item.sidebarLight) &&
    isHex(item.sidebarDark) &&
    isHex(item.mainLight) &&
    isHex(item.mainDark)
  )
}

/** Valida lo que llega de la API antes de inyectarlo como CSS. */
export function normalizeDesignTokens(value: unknown): DesignTokens | null {
  if (!value || typeof value !== "object") return null
  const item = value as Record<string, unknown>

  // Los tokens guardados antes de existir `surfaces` se completan con los
  // valores por defecto; el resto del tema no se toca.
  return {
    button: isButton(item.button) ? item.button : DEFAULT_DESIGN_TOKENS.button,
    badge: isBadge(item.badge) ? item.badge : DEFAULT_DESIGN_TOKENS.badge,
    tabs: isTabs(item.tabs) ? item.tabs : DEFAULT_DESIGN_TOKENS.tabs,
    surfaces: isSurfaces(item.surfaces)
      ? item.surfaces
      : DEFAULT_DESIGN_TOKENS.surfaces,
  }
}

/** CSS que aplica los tokens a los componentes de toda la app. */
export function designCss(tokens: DesignTokens): string {
  const { button, badge, tabs, surfaces } = tokens

  return `
[data-slot="button"][data-variant="default"] {
  background-color: ${button.bg} !important;
  color: ${button.fg} !important;
  border-radius: ${button.radius}px !important;
  border-width: ${button.borderWidth}px !important;
  border-style: solid !important;
  border-color: ${button.borderColor} !important;
}
[data-slot="button"][data-variant="default"]:hover {
  background-color: ${button.hoverBg} !important;
}
[data-slot="button"][data-variant="default"]:active {
  background-color: ${button.hoverBg} !important;
}
[data-slot="badge"][data-variant="default"] {
  background-color: ${badge.bg} !important;
  color: ${badge.fg} !important;
  border-radius: ${badge.radius}px !important;
  border-width: ${badge.borderWidth}px !important;
  border-style: solid !important;
  border-color: ${badge.borderColor} !important;
}
[data-slot="tabs-trigger"] {
  color: ${tabs.inactiveFg} !important;
  border-radius: ${tabs.radius}px !important;
}
[data-slot="tabs-trigger"][data-active] {
  background-color: ${tabs.activeBg} !important;
  color: ${tabs.activeFg} !important;
}
[data-slot="sidebar-wrapper"] {
  background-color: ${surfaces.sidebarLight} !important;
}
[data-slot="sidebar-inset"] {
  background-color: ${surfaces.mainLight} !important;
}
.dark [data-slot="sidebar-wrapper"] {
  background-color: ${surfaces.sidebarDark} !important;
}
.dark [data-slot="sidebar-inset"] {
  background-color: ${surfaces.mainDark} !important;
}
`.trim()
}
