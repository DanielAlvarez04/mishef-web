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
  DEFAULT_DESIGN_TOKENS,
  designCss,
  type BadgeStyleTokens,
  type ButtonStyleTokens,
  type DesignTokens,
  type SurfaceStyleTokens,
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
 * El borrador se previsualiza al instante. «Aplicar a la app» publica los
 * tokens: el layout inyecta el CSS y todos los usuarios ven el cambio. Los
 * fondos del armazón tienen variante clara y oscura.
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

  const sidebarBg =
    mode === "dark" ? tokens.surfaces.sidebarDark : tokens.surfaces.sidebarLight
  const mainBg =
    mode === "dark" ? tokens.surfaces.mainDark : tokens.surfaces.mainLight

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
        {draft ? <Badge variant="outline">Borrador guardado</Badge> : null}
      </div>

      {!canEdit ? (
        <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          Puedes probar los controles, pero solo el equipo de Mishef puede
          guardar o aplicar estilos.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <PaintbrushIcon className="size-4" /> Vista previa
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
          </CardTitle>
          <CardDescription>
            Los cambios se ven aquí al instante; en el resto de la app se aplican
            con «Aplicar a la app».
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div
            className="overflow-hidden rounded-lg border p-3"
            style={{ backgroundColor: sidebarBg }}
          >
            <div className="flex gap-3">
              <div
                className="w-32 rounded-md border p-3 text-xs"
                style={{ backgroundColor: sidebarBg, color: mode === "dark" ? "#f5f5f4" : "#2b2b29" }}
              >
                Sidebar
              </div>
              <div
                className="flex-1 rounded-md border p-3"
                style={{ backgroundColor: mainBg }}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    style={buttonPreview}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium"
                  >
                    Botón principal
                  </button>
                  <button
                    type="button"
                    style={{
                      ...buttonPreview,
                      backgroundColor: tokens.button.hoverBg,
                    }}
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
                </div>
                <div className="mt-3 flex gap-1 rounded-lg border p-1">
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
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 @3xl/main:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fondos del armazón</CardTitle>
            <CardDescription>
              Sidebar y main, con variante para tema claro y oscuro.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ColorControl
              id="surface-sidebar-light"
              label="Sidebar · claro"
              value={tokens.surfaces.sidebarLight}
              onChange={(value) => updateSurface("sidebarLight", value)}
              disabled={disabled}
            />
            <ColorControl
              id="surface-sidebar-dark"
              label="Sidebar · oscuro"
              value={tokens.surfaces.sidebarDark}
              onChange={(value) => updateSurface("sidebarDark", value)}
              disabled={disabled}
            />
            <ColorControl
              id="surface-main-light"
              label="Main · claro"
              value={tokens.surfaces.mainLight}
              onChange={(value) => updateSurface("mainLight", value)}
              disabled={disabled}
            />
            <ColorControl
              id="surface-main-dark"
              label="Main · oscuro"
              value={tokens.surfaces.mainDark}
              onChange={(value) => updateSurface("mainDark", value)}
              disabled={disabled}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Botones</CardTitle>
            <CardDescription>
              Variante principal (`default`). Outline y ghost conservan el tema.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ColorControl
              id="button-bg"
              label="Fondo"
              value={tokens.button.bg}
              onChange={(value) => updateButton("bg", value)}
              disabled={disabled}
            />
            <ColorControl
              id="button-fg"
              label="Texto"
              value={tokens.button.fg}
              onChange={(value) => updateButton("fg", value)}
              disabled={disabled}
            />
            <ColorControl
              id="button-hover"
              label="Fondo hover"
              value={tokens.button.hoverBg}
              onChange={(value) => updateButton("hoverBg", value)}
              disabled={disabled}
            />
            <ColorControl
              id="button-border"
              label="Color del borde"
              value={tokens.button.borderColor}
              onChange={(value) => updateButton("borderColor", value)}
              disabled={disabled}
            />
            <NumberControl
              id="button-radius"
              label="Radio (px)"
              value={tokens.button.radius}
              min={0}
              max={40}
              onChange={(value) => updateButton("radius", value)}
              disabled={disabled}
            />
            <NumberControl
              id="button-border-width"
              label="Grosor del borde (px)"
              value={tokens.button.borderWidth}
              min={0}
              max={6}
              onChange={(value) => updateButton("borderWidth", value)}
              disabled={disabled}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chips / badges</CardTitle>
            <CardDescription>
              Variante principal. Los estados usan sus propios colores.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ColorControl
              id="badge-bg"
              label="Fondo"
              value={tokens.badge.bg}
              onChange={(value) => updateBadge("bg", value)}
              disabled={disabled}
            />
            <ColorControl
              id="badge-fg"
              label="Texto"
              value={tokens.badge.fg}
              onChange={(value) => updateBadge("fg", value)}
              disabled={disabled}
            />
            <ColorControl
              id="badge-border"
              label="Color del borde"
              value={tokens.badge.borderColor}
              onChange={(value) => updateBadge("borderColor", value)}
              disabled={disabled}
            />
            <NumberControl
              id="badge-radius"
              label="Radio (px)"
              value={tokens.badge.radius}
              min={0}
              max={9999}
              onChange={(value) => updateBadge("radius", value)}
              disabled={disabled}
            />
            <NumberControl
              id="badge-border-width"
              label="Grosor del borde (px)"
              value={tokens.badge.borderWidth}
              min={0}
              max={6}
              onChange={(value) => updateBadge("borderWidth", value)}
              disabled={disabled}
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
              disabled={disabled}
            />
            <ColorControl
              id="tabs-active-fg"
              label="Texto activo"
              value={tokens.tabs.activeFg}
              onChange={(value) => updateTabs("activeFg", value)}
              disabled={disabled}
            />
            <ColorControl
              id="tabs-inactive-fg"
              label="Texto inactivo"
              value={tokens.tabs.inactiveFg}
              onChange={(value) => updateTabs("inactiveFg", value)}
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
    </div>
  )
}
