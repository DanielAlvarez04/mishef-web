"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  Loader2Icon,
  PaintbrushIcon,
  RotateCcwIcon,
  SaveIcon,
} from "lucide-react"
import { toast } from "sonner"

import { resetDesignTokens, saveDesignTokens } from "@/lib/design-actions"
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
  DEFAULT_DESIGN_TOKENS,
  designCss,
  type BadgeStyleTokens,
  type ButtonStyleTokens,
  type DesignTokens,
  type TabsStyleTokens,
} from "@/lib/design"

function ColorControl({
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
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="size-9 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-1"
        />
        <Input
          aria-label={`${label} en hexadecimal`}
          value={value}
          maxLength={7}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="max-w-32 font-mono text-xs"
        />
      </div>
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

/**
 * Laboratorio de estilos.
 *
 * Los cambios se previsualizan al instante con estilos inline y, al guardar,
 * se aplican a toda la app mediante CSS inyectado en el layout. «Restablecer»
 * borra los tokens y vuelve al tema original.
 */
export function StyleLab({ initial }: { initial: DesignTokens | null }) {
  const router = useRouter()
  const [tokens, setTokens] = useState<DesignTokens>(
    initial ?? DEFAULT_DESIGN_TOKENS
  )
  const [pending, startTransition] = useTransition()

  function updateButton<K extends keyof ButtonStyleTokens>(
    key: K,
    value: ButtonStyleTokens[K]
  ) {
    setTokens((current) => ({
      ...current,
      button: { ...current.button, [key]: value },
    }))
  }

  function updateBadge<K extends keyof BadgeStyleTokens>(
    key: K,
    value: BadgeStyleTokens[K]
  ) {
    setTokens((current) => ({
      ...current,
      badge: { ...current.badge, [key]: value },
    }))
  }

  function updateTabs<K extends keyof TabsStyleTokens>(
    key: K,
    value: TabsStyleTokens[K]
  ) {
    setTokens((current) => ({
      ...current,
      tabs: { ...current.tabs, [key]: value },
    }))
  }

  function save() {
    startTransition(async () => {
      const result = await saveDesignTokens(tokens)

      if (!result.ok) {
        toast.error(result.message ?? "No se pudieron guardar los estilos")
        return
      }

      toast.success("Estilos guardados")
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

  const buttonPreview = {
    backgroundColor: tokens.button.bg,
    color: tokens.button.fg,
    borderRadius: `${tokens.button.radius}px`,
    borderWidth: `${tokens.button.borderWidth}px`,
    borderStyle: "solid",
    borderColor: tokens.button.borderColor,
  } as const

  const badgePreview = {
    backgroundColor: tokens.badge.bg,
    color: tokens.badge.fg,
    borderRadius: `${tokens.badge.radius}px`,
    borderWidth: `${tokens.badge.borderWidth}px`,
    borderStyle: "solid",
    borderColor: tokens.badge.borderColor,
  } as const

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={save} disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
          Guardar estilos
        </Button>
        <Button variant="outline" onClick={reset} disabled={pending}>
          <RotateCcwIcon />
          Restablecer
        </Button>
        <p className="text-xs text-muted-foreground">
          Se aplican a toda la app y se guardan en la base de datos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PaintbrushIcon className="size-4" /> Vista previa
          </CardTitle>
          <CardDescription>
            Los cambios se ven al instante aquí; en el resto de la app se aplican
            al guardar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            style={buttonPreview}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium"
          >
            Botón principal
          </button>
          <button
            type="button"
            style={{ ...buttonPreview, backgroundColor: tokens.button.hoverBg }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium"
          >
            Hover / activo
          </button>
          <span
            style={badgePreview}
            className="inline-flex items-center px-2 py-0.5 text-xs font-medium"
          >
            Activo
          </span>
          <div
            className="inline-flex gap-1 border p-1"
            style={{ borderRadius: `${tokens.tabs.radius + 4}px` }}
          >
            <span
              style={{
                backgroundColor: tokens.tabs.activeBg,
                color: tokens.tabs.activeFg,
                borderRadius: `${tokens.tabs.radius}px`,
              }}
              className="px-3 py-1 text-sm font-medium"
            >
              General
            </span>
            <span
              style={{
                color: tokens.tabs.inactiveFg,
                borderRadius: `${tokens.tabs.radius}px`,
              }}
              className="px-3 py-1 text-sm font-medium"
            >
              Equipo
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 @3xl/main:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Botones</CardTitle>
            <CardDescription>
              Variante principal (`default`). Los botones outline y ghost
              conservan el tema.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ColorControl
              id="button-bg"
              label="Fondo"
              value={tokens.button.bg}
              onChange={(value) => updateButton("bg", value)}
              disabled={pending}
            />
            <ColorControl
              id="button-fg"
              label="Texto"
              value={tokens.button.fg}
              onChange={(value) => updateButton("fg", value)}
              disabled={pending}
            />
            <ColorControl
              id="button-hover"
              label="Fondo hover"
              value={tokens.button.hoverBg}
              onChange={(value) => updateButton("hoverBg", value)}
              disabled={pending}
            />
            <ColorControl
              id="button-border"
              label="Color del borde"
              value={tokens.button.borderColor}
              onChange={(value) => updateButton("borderColor", value)}
              disabled={pending}
            />
            <NumberControl
              id="button-radius"
              label="Radio (px)"
              value={tokens.button.radius}
              min={0}
              max={40}
              onChange={(value) => updateButton("radius", value)}
              disabled={pending}
            />
            <NumberControl
              id="button-border-width"
              label="Grosor del borde (px)"
              value={tokens.button.borderWidth}
              min={0}
              max={6}
              onChange={(value) => updateButton("borderWidth", value)}
              disabled={pending}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chips / badges</CardTitle>
            <CardDescription>
              Variante principal. Los estados (activo, pendiente) usan sus
              propios colores.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ColorControl
              id="badge-bg"
              label="Fondo"
              value={tokens.badge.bg}
              onChange={(value) => updateBadge("bg", value)}
              disabled={pending}
            />
            <ColorControl
              id="badge-fg"
              label="Texto"
              value={tokens.badge.fg}
              onChange={(value) => updateBadge("fg", value)}
              disabled={pending}
            />
            <ColorControl
              id="badge-border"
              label="Color del borde"
              value={tokens.badge.borderColor}
              onChange={(value) => updateBadge("borderColor", value)}
              disabled={pending}
            />
            <NumberControl
              id="badge-radius"
              label="Radio (px)"
              value={tokens.badge.radius}
              min={0}
              max={9999}
              onChange={(value) => updateBadge("radius", value)}
              disabled={pending}
            />
            <NumberControl
              id="badge-border-width"
              label="Grosor del borde (px)"
              value={tokens.badge.borderWidth}
              min={0}
              max={6}
              onChange={(value) => updateBadge("borderWidth", value)}
              disabled={pending}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tabs</CardTitle>
            <CardDescription>
              Pestañas activas e inactivas del panel.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ColorControl
              id="tabs-active-bg"
              label="Fondo activo"
              value={tokens.tabs.activeBg}
              onChange={(value) => updateTabs("activeBg", value)}
              disabled={pending}
            />
            <ColorControl
              id="tabs-active-fg"
              label="Texto activo"
              value={tokens.tabs.activeFg}
              onChange={(value) => updateTabs("activeFg", value)}
              disabled={pending}
            />
            <ColorControl
              id="tabs-inactive-fg"
              label="Texto inactivo"
              value={tokens.tabs.inactiveFg}
              onChange={(value) => updateTabs("inactiveFg", value)}
              disabled={pending}
            />
            <NumberControl
              id="tabs-radius"
              label="Radio (px)"
              value={tokens.tabs.radius}
              min={0}
              max={40}
              onChange={(value) => updateTabs("radius", value)}
              disabled={pending}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CSS generado</CardTitle>
            <CardDescription>
              Esto es lo que se inyecta en la app al guardar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-72 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs">
              {designCss(tokens)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
