/**
 * Colores para las secciones (grupos) de un menú.
 *
 * Saltamos familias intermedias para que los colores se distingan a simple
 * vista: cielo → índigo → púrpura → rosa → rojo → naranja → amarillo → lima →
 * verde → turquesa. La secuencia usa primero los tonos 300, después los 500 y
 * al final los 700.
 */
export const GROUP_COLOR_SHADES = [300, 500, 700] as const

export type GroupColorShade = (typeof GROUP_COLOR_SHADES)[number]

export const GROUP_COLOR_PALETTE = {
  sky: {
    300: "oklch(82.8% 0.111 230.318)",
    500: "oklch(68.5% 0.169 237.323)",
    700: "oklch(50% 0.134 242.749)",
  },
  indigo: {
    300: "oklch(78.5% 0.115 274.713)",
    500: "oklch(58.5% 0.233 277.117)",
    700: "oklch(45.7% 0.24 277.023)",
  },
  purple: {
    300: "oklch(82.7% 0.119 306.383)",
    500: "oklch(62.7% 0.265 303.9)",
    700: "oklch(49.6% 0.265 301.924)",
  },
  pink: {
    300: "oklch(82.3% 0.12 346.018)",
    500: "oklch(65.6% 0.241 354.308)",
    700: "oklch(52.5% 0.223 3.958)",
  },
  red: {
    300: "oklch(80.8% 0.114 19.571)",
    500: "oklch(63.7% 0.237 25.331)",
    700: "oklch(50.5% 0.213 27.518)",
  },
  orange: {
    300: "oklch(83.7% 0.128 66.29)",
    500: "oklch(70.5% 0.213 47.604)",
    700: "oklch(55.3% 0.195 38.402)",
  },
  yellow: {
    300: "oklch(90.5% 0.182 98.111)",
    500: "oklch(79.5% 0.184 86.047)",
    700: "oklch(55.4% 0.135 66.442)",
  },
  lime: {
    300: "oklch(89.7% 0.196 126.665)",
    500: "oklch(76.8% 0.233 130.85)",
    700: "oklch(53.2% 0.157 131.589)",
  },
  green: {
    300: "oklch(87.1% 0.15 154.449)",
    500: "oklch(72.3% 0.219 149.579)",
    700: "oklch(52.7% 0.154 150.069)",
  },
  teal: {
    300: "oklch(85.5% 0.138 181.071)",
    500: "oklch(70.4% 0.14 182.503)",
    700: "oklch(51.1% 0.096 186.391)",
  },
} as const satisfies Record<string, Record<GroupColorShade, string>>

export type GroupColorName = keyof typeof GROUP_COLOR_PALETTE
export type GroupColor = `${GroupColorName}-${GroupColorShade}`

export const GROUP_COLOR_NAMES = Object.keys(
  GROUP_COLOR_PALETTE
) as GroupColorName[]

export const GROUP_COLOR_LABELS: Record<GroupColorName, string> = {
  sky: "Cielo",
  indigo: "Índigo",
  purple: "Púrpura",
  pink: "Rosa",
  red: "Rojo",
  orange: "Naranja",
  yellow: "Amarillo",
  lime: "Lima",
  green: "Verde",
  teal: "Turquesa",
}

/** Todos los 300 primero, luego los 500 y al final los 700. */
export const GROUP_COLOR_SEQUENCE = GROUP_COLOR_SHADES.flatMap((shade) =>
  GROUP_COLOR_NAMES.map((name) => `${name}-${shade}`)
)

const GROUP_COLOR_VALUES = new Map<string, string>()

for (const name of GROUP_COLOR_NAMES) {
  for (const shade of GROUP_COLOR_SHADES) {
    GROUP_COLOR_VALUES.set(
      `${name}-${shade}`,
      GROUP_COLOR_PALETTE[name][shade]
    )
  }
}

const GROUP_COLOR_SET = new Set(GROUP_COLOR_VALUES.keys())

export function groupColorValue(value: string | null | undefined): string | null {
  if (!value) return null
  return GROUP_COLOR_VALUES.get(value) ?? null
}

export function isGroupColor(value: unknown): value is string {
  return typeof value === "string" && GROUP_COLOR_SET.has(value)
}

/** Etiqueta “Cielo 300” para tooltips y accesibilidad. */
export function groupColorLabel(token: string): string {
  const [name, shade] = token.split("-")
  const label = GROUP_COLOR_LABELS[name as GroupColorName]

  return label ? `${label} ${shade}` : token
}

/**
 * Colores por grupo: conserva los válidos y completa los nuevos con la
 * secuencia. Si un color se repite, solo queda en el primer grupo.
 */
export function defaultGroupColors(
  groups: string[],
  input: Record<string, string> | null | undefined
): Record<string, string> {
  const result: Record<string, string> = {}
  const used = new Set<string>()

  for (const group of groups) {
    const value = input?.[group]

    if (isGroupColor(value) && !used.has(value)) {
      result[group] = value
      used.add(value)
    }
  }

  let cursor = 0

  for (const group of groups) {
    if (result[group]) continue

    while (cursor < GROUP_COLOR_SEQUENCE.length) {
      const candidate = GROUP_COLOR_SEQUENCE[cursor]
      cursor += 1

      if (used.has(candidate)) continue

      result[group] = candidate
      used.add(candidate)
      break
    }
  }

  return result
}
