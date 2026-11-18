"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  Loader2Icon,
  MoonIcon,
  PaintbrushIcon,
  RocketIcon,
  RotateCcwIcon,
  SaveIcon,
  SunIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  applyDesignTokens,
  resetDesignTokens,
  saveDesignDraft,
} from "@/lib/design-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  BUTTON_VARIANTS,
  CHIP_VARIANTS,
  DEFAULT_DESIGN_TOKENS,
  designCss,
  type ButtonVariant,
  type ButtonVariantTokens,
  type ChipVariant,
  type ChipVariantTokens,
  type DesignTokens,
  type SurfaceStyleTokens,
  type TabsTokens,
} from "@/lib/design"
import {
  SPECIAL_COLORS,
  TAILWIND_FAMILIES,
  TAILWIND_SHADES,
  resolveColor,
} from "@/lib/tailwind-colors"

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"

/** Selector de color limitado a la paleta oficial de Tailwind. */
function ColorField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  const isSpecial = value in SPECIAL_COLORS
  const [family, shade] = value.split("-")
  const selectedFamily = isSpecial ? "special" : family
  const selectedShade = isSpecial ? "500" : (shade ?? "500")

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-9 shrink-0 rounded-md border border-input"
          style={{ backgroundColor: resolveColor(value) }}
        />
        <select
          id={id}
          aria-label={`${label}: familia`}
          value={selectedFamily}
          onChange={(event) => {
            const next = event.target.value
            onChange(next === "special" ? "white" : `${next}-${selectedShade}`)
          }}
          disabled={disabled}
          className={SELECT_CLASS}
        >
          <option value="special">Especiales</option>
          {TAILWIND_FAMILIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          aria-label={`${label}: tono`}
          value={isSpecial ? value : selectedShade}
          onChange={(event) => {
            const next = event.target.value
            onChange(isSpecial ? next : `${family}-${next}`)
          }}
          disabled={disabled}
          className={SELECT_CLASS}
        >
          {isSpecial
            ? Object.keys(SPECIAL_COLORS).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))
            : TAILWIND_SHADES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
        </select>
      </div>
      <span className="font-mono text-[10px] text-muted-foreground">{value}</span>
    </Field>
  )
}

function NumberControl({
  id,
  label,
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  disabled: boolean
}) {
  return (
    <Field className="max-w-40">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          disabled={disabled}
          className="w-full accent-primary"
        />
        <Input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          disabled={disabled}
          className="w-16 text-xs"
        />
      </div>
    </Field>
  )
}

function buttonStyle(tokens: ButtonVariantTokens) {
  return {
    backgroundColor: resolveColor(tokens.bg),
    color: resolveColor(tokens.fg),
    borderColor: resolveColor(tokens.border),
    borderWidth: `${tokens.borderWidth}px`,
    borderStyle: "solid",
    borderRadius: `${tokens.radius}px`,
  } as const
}

function chipStyle(tokens: ChipVariantTokens) {
  return {
    backgroundColor: resolveColor(tokens.bg),
    color: resolveColor(tokens.fg),
    borderColor: resolveColor(tokens.border),
    borderWidth: `${tokens.borderWidth}px`,
    borderStyle: "solid",
    borderRadius: `${tokens.radius}px`,
  } as const
}

function ButtonVariantEditor({
  label,
  tokens,
  onChange,
  disabled,
}: {
  label: string
  tokens: ButtonVariantTokens
  onChange: (
    key: keyof ButtonVariantTokens,
    value: string | number
  ) => void
  disabled: boolean
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h3 className="mr-auto text-sm font-semibold">{label}</h3>
        <button
          type="button"
          style={buttonStyle(tokens)}
          className="inline-flex items-center px-4 py-2 text-sm font-medium"
        >
          Normal
        </button>
        <button
          type="button"
          style={{ ...buttonStyle(tokens), backgroundColor: resolveColor(tokens.hoverBg) }}
          className="inline-flex items-center px-4 py-2 text-sm font-medium"
        >
          Hover
        </button>
        <button
          type="button"
          style={{ ...buttonStyle(tokens), backgroundColor: resolveColor(tokens.activeBg) }}
          className="inline-flex items-center px-4 py-2 text-sm font-medium"
        >
          On click
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 @3xl/main:grid-cols-3">
        <ColorField
          id={`${label}-bg`}
          label="Fondo"
          value={tokens.bg}
          onChange={(value) => onChange("bg", value)}
          disabled={disabled}
        />
        <ColorField
          id={`${label}-fg`}
          label="Texto"
          value={tokens.fg}
          onChange={(value) => onChange("fg", value)}
          disabled={disabled}
        />
        <ColorField
          id={`${label}-border`}
          label="Borde"
          value={tokens.border}
          onChange={(value) => onChange("border", value)}
          disabled={disabled}
        />
        <ColorField
          id={`${label}-hover`}
          label="Fondo hover"
          value={tokens.hoverBg}
          onChange={(value) => onChange("hoverBg", value)}
          disabled={disabled}
        />
        <ColorField
          id={`${label}-active`}
          label="Fondo on click"
          value={tokens.activeBg}
          onChange={(value) => onChange("activeBg", value)}
          disabled={disabled}
        />
        <NumberControl
          id={`${label}-radius`}
          label="Radio (px)"
          value={tokens.radius}
          min={0}
          max={40}
          onChange={(value) => onChange("radius", value)}
          disabled={disabled}
        />
        <NumberControl
          id={`${label}-border-width`}
          label="Grosor del borde (px)"
          value={tokens.borderWidth}
          min={0}
          max={6}
          onChange={(value) => onChange("borderWidth", value)}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

function ChipVariantEditor({
  label,
  tokens,
  onChange,
  disabled,
}: {
  label: string
  tokens: ChipVariantTokens
  onChange: (key: keyof ChipVariantTokens, value: string | number) => void
  disabled: boolean
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h3 className="mr-auto text-sm font-semibold">{label}</h3>
        <span
          style={chipStyle(tokens)}
          className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium"
        >
          Normal
        </span>
        <span
          style={{ ...chipStyle(tokens), backgroundColor: resolveColor(tokens.hoverBg) }}
          className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium"
        >
          Hover
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 @3xl/main:grid-cols-3">
        <ColorField
          id={`${label}-chip-bg`}
          label="Fondo"
          value={tokens.bg}
          onChange={(value) => onChange("bg", value)}
          disabled={disabled}
        />
        <ColorField
          id={`${label}-chip-fg`}
          label="Texto"
          value={tokens.fg}
          onChange={(value) => onChange("fg", value)}
          disabled={disabled}
        />
        <ColorField
          id={`${label}-chip-border`}
          label="Borde"
          value={tokens.border}
          onChange={(value) => onChange("border", value)}
          disabled={disabled}
        />
        <ColorField
          id={`${label}-chip-hover`}
          label="Fondo hover"
          value={tokens.hoverBg}
          onChange={(value) => onChange("hoverBg", value)}
          disabled={disabled}
        />
        <NumberControl
          id={`${label}-chip-radius`}
          label="Radio (px)"
          value={tokens.radius}
          min={0}
          max={9999}
          onChange={(value) => onChange("radius", value)}
          disabled={disabled}
        />
        <NumberControl
          id={`${label}-chip-border-width`}
          label="Grosor del borde (px)"
          value={tokens.borderWidth}
          min={0}
          max={6}
          onChange={(value) => onChange("borderWidth", value)}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

/**
 * Laboratorio de estilos.
 *
 * Cada componente tiene su sección con todas las variantes y estados. Los
 * colores salen de la paleta oficial de Tailwind; el borrador se previsualiza
 * al instante y «Aplicar a la app» publica los tokens.
 */
export function StyleLab({
  applied,
  draft,
  canEdit,
}: {
  applied: DesignTokens | null
  draft: DesignTokens | null
  canEdit: boolean
}) {
  const router = useRouter()
  const [tokens, setTokens] = useState<DesignTokens>(
    draft ?? applied ?? DEFAULT_DESIGN_TOKENS
  )
  const [mode, setMode] = useState<"light" | "dark">("light")
  const [pending, startTransition] = useTransition()

  function updateButton<K extends keyof ButtonVariantTokens>(
    variant: ButtonVariant,
    key: K,
    value: ButtonVariantTokens[K]
  ) {
    setTokens((current) => ({
      ...current,
      buttons: {
        ...current.buttons,
        [variant]: { ...current.buttons[variant], [key]: value },
      },
    }))
  }

  function updateChip<K extends keyof ChipVariantTokens>(
    variant: ChipVariant,
    key: K,
    value: ChipVariantTokens[K]
  ) {
    setTokens((current) => ({
      ...current,
      chips: {
        ...current.chips,
        [variant]: { ...current.chips[variant], [key]: value },
      },
    }))
  }

  function updateTabs<K extends keyof TabsTokens>(
    key: K,
    value: TabsTokens[K]
  ) {
    setTokens((current) => ({
      ...current,
      tabs: { ...current.tabs, [key]: value },
    }))
  }

  function updateSurface<K extends keyof SurfaceStyleTokens>(
    key: K,
    value: SurfaceStyleTokens[K]
  ) {
    setTokens((current) => ({
      ...current,
      surfaces: { ...current.surfaces, [key]: value },
    }))
  }

  function saveDraft() {
    startTransition(async () => {
      const result = await saveDesignDraft(tokens)

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo guardar el borrador")
        return
      }

      toast.success("Borrador guardado")
      router.refresh()
    })
  }

  function apply() {
    startTransition(async () => {
      const result = await applyDesignTokens(tokens)

      if (!result.ok) {
        toast.error(result.message ?? "No se pudieron aplicar los estilos")
        return
      }

      toast.success("Estilos aplicados a la app")
      router.refresh()
    })
  }

  function reset() {
    startTransition(async () => {
      const result = await resetDesignTokens()

      if (!result.ok) {
        toast.error(result.message ?? "No se pudieron restablecer los estilos")
        return
      }

      setTokens(DEFAULT_DESIGN_TOKENS)
      toast.success("Estilos restablecidos")
      router.refresh()
    })
  }

  const disabled = pending || !canEdit
  const mainBg =
    mode === "dark" ? tokens.surfaces.mainDark : tokens.surfaces.mainLight
  const mainColor = mode === "dark" ? "neutral-100" : "neutral-900"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={saveDraft} disabled={disabled} variant="outline">
          {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
          Guardar borrador
        </Button>
        <Button onClick={apply} disabled={disabled}>
          <RocketIcon />
          Aplicar a la app
        </Button>
        <Button variant="outline" onClick={reset} disabled={disabled}>
          <RotateCcwIcon />
          Restablecer
        </Button>
        {applied ? <Badge variant="secondary">Aplicado</Badge> : null}
        {draft ? <Badge variant="outline">Borrador</Badge> : null}
        <span className="ml-auto inline-flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant={mode === "light" ? "default" : "outline"}
            onClick={() => setMode("light")}
          >
            <SunIcon /> Claro
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "dark" ? "default" : "outline"}
            onClick={() => setMode("dark")}
          >
            <MoonIcon /> Oscuro
          </Button>
        </span>
      </div>

      {!canEdit ? (
        <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          Puedes probar los controles, pero solo las cuentas autorizadas pueden
          guardar o aplicar estilos.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PaintbrushIcon className="size-4" /> Botones
          </CardTitle>
          <CardDescription>
            Las cuatro variantes con sus estados normal, hover y on click. Los
            colores salen de la paleta de Tailwind.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {BUTTON_VARIANTS.map((variant) => (
            <ButtonVariantEditor
              key={variant.key}
              label={variant.label}
              tokens={tokens.buttons[variant.key]}
              onChange={(key, value) =>
                updateButton(variant.key, key, value as never)
              }
              disabled={disabled}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chips</CardTitle>
          <CardDescription>
            Badges del panel con sus variantes y hover.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {CHIP_VARIANTS.map((variant) => (
            <ChipVariantEditor
              key={variant.key}
              label={variant.label}
              tokens={tokens.chips[variant.key]}
              onChange={(key, value) =>
                updateChip(variant.key, key, value as never)
              }
              disabled={disabled}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tabs</CardTitle>
          <CardDescription>
            Pestañas activas, inactivas y hover.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div
            className="flex gap-1 rounded-lg border p-1"
            style={{ backgroundColor: resolveColor(mainBg), color: resolveColor(mainColor) }}
          >
            <span
              style={{
                backgroundColor: resolveColor(tokens.tabs.activeBg),
                color: resolveColor(tokens.tabs.activeFg),
                borderRadius: `${tokens.tabs.radius}px`,
              }}
              className="px-3 py-1 text-sm font-medium"
            >
              Activo
            </span>
            <span
              style={{
                color: resolveColor(tokens.tabs.inactiveFg),
                borderRadius: `${tokens.tabs.radius}px`,
              }}
              className="px-3 py-1 text-sm font-medium"
            >
              Inactivo
            </span>
            <span
              style={{
                color: resolveColor(tokens.tabs.hoverFg),
                borderRadius: `${tokens.tabs.radius}px`,
              }}
              className="px-3 py-1 text-sm font-medium underline underline-offset-4"
            >
              Hover
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 @3xl/main:grid-cols-3">
            <ColorField
              id="tabs-active-bg"
              label="Fondo activo"
              value={tokens.tabs.activeBg}
              onChange={(value) => updateTabs("activeBg", value)}
              disabled={disabled}
            />
            <ColorField
              id="tabs-active-fg"
              label="Texto activo"
              value={tokens.tabs.activeFg}
              onChange={(value) => updateTabs("activeFg", value)}
              disabled={disabled}
            />
            <ColorField
              id="tabs-inactive-fg"
              label="Texto inactivo"
              value={tokens.tabs.inactiveFg}
              onChange={(value) => updateTabs("inactiveFg", value)}
              disabled={disabled}
            />
            <ColorField
              id="tabs-hover-fg"
              label="Texto hover"
              value={tokens.tabs.hoverFg}
              onChange={(value) => updateTabs("hoverFg", value)}
              disabled={disabled}
            />
            <NumberControl
              id="tabs-radius"
              label="Radio (px)"
              value={tokens.tabs.radius}
              min={0}
              max={40}
              onChange={(value) => updateTabs("radius", value)}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fondos del armazón</CardTitle>
          <CardDescription>
            Sidebar y main, con variante para tema claro y oscuro.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div
            className="overflow-hidden rounded-lg border p-3"
            style={{
              backgroundColor: resolveColor(
                mode === "dark"
                  ? tokens.surfaces.sidebarDark
                  : tokens.surfaces.sidebarLight
              ),
            }}
          >
            <div className="flex gap-3">
              <div
                className="w-32 rounded-md border p-3 text-xs"
                style={{
                  backgroundColor: resolveColor(
                    mode === "dark"
                      ? tokens.surfaces.sidebarDark
                      : tokens.surfaces.sidebarLight
                  ),
                  color: resolveColor(mainColor),
                }}
              >
                Sidebar
              </div>
              <div
                className="flex-1 rounded-md border p-3 text-xs"
                style={{
                  backgroundColor: resolveColor(mainBg),
                  color: resolveColor(mainColor),
                }}
              >
                Main
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 @3xl/main:grid-cols-4">
            <ColorField
              id="surface-sidebar-light"
              label="Sidebar · claro"
              value={tokens.surfaces.sidebarLight}
              onChange={(value) => updateSurface("sidebarLight", value)}
              disabled={disabled}
            />
            <ColorField
              id="surface-sidebar-dark"
              label="Sidebar · oscuro"
              value={tokens.surfaces.sidebarDark}
              onChange={(value) => updateSurface("sidebarDark", value)}
              disabled={disabled}
            />
            <ColorField
              id="surface-main-light"
              label="Main · claro"
              value={tokens.surfaces.mainLight}
              onChange={(value) => updateSurface("mainLight", value)}
              disabled={disabled}
            />
            <ColorField
              id="surface-main-dark"
              label="Main · oscuro"
              value={tokens.surfaces.mainDark}
              onChange={(value) => updateSurface("mainDark", value)}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CSS generado</CardTitle>
          <CardDescription>
            Esto es lo que se inyecta en la app al aplicar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="max-h-72 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs">
            {designCss(tokens)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
