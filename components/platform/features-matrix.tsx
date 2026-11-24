"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, RotateCcwIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  FEATURE_CATALOG,
  FEATURE_GROUP_LABELS,
  type FeatureGroup,
  type PlatformFeatureOrganization,
} from "@/lib/features"
import { saveOrganizationFeatures } from "@/app/(app)/platform/features/actions"

const GROUPS: FeatureGroup[] = ["service", "application", "settings"]

function effectiveFor(organization: PlatformFeatureOrganization) {
  return Object.fromEntries(
    FEATURE_CATALOG.map((feature) => [
      feature.key,
      organization.overrides[feature.key] ?? feature.default,
    ])
  ) as Record<string, boolean>
}

export function FeaturesMatrix({
  organizations,
}: {
  organizations: PlatformFeatureOrganization[]
}) {
  const router = useRouter()
  const [selectedId, setSelectedId] = React.useState(
    organizations[0]?.id ?? ""
  )
  const selected =
    organizations.find((organization) => organization.id === selectedId) ??
    organizations[0] ??
    null
  const [draft, setDraft] = React.useState<Record<string, boolean>>(() =>
    selected ? effectiveFor(selected) : {}
  )
  const [pending, setPending] = React.useState(false)

  function choose(id: string | null) {
    const next = organizations.find((organization) => organization.id === id)

    if (!next) return

    setSelectedId(next.id)
    setDraft(effectiveFor(next))
  }

  function toggle(key: string, enabled: boolean) {
    setDraft((current) => ({ ...current, [key]: enabled }))
  }

  function resetDefaults() {
    setDraft(
      Object.fromEntries(
        FEATURE_CATALOG.map((feature) => [feature.key, feature.default])
      )
    )
  }

  function enableAll() {
    setDraft(
      Object.fromEntries(FEATURE_CATALOG.map((feature) => [feature.key, true]))
    )
  }

  async function save() {
    if (!selected) return

    // Solo guardamos lo que difiere del default: el resto sigue heredando.
    const overrides = Object.fromEntries(
      FEATURE_CATALOG.filter(
        (feature) => draft[feature.key] !== feature.default
      ).map((feature) => [feature.key, draft[feature.key]])
    )

    setPending(true)

    try {
      const result = await saveOrganizationFeatures(selected.id, overrides)

      if (!result.ok) {
        toast.error(result.message ?? "No se pudieron guardar las funciones")
        return
      }

      toast.success("Funciones actualizadas")
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  if (!selected) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          No hay negocios para configurar.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:max-w-md">
        <span className="text-xs font-medium text-muted-foreground">
          Negocio
        </span>
        <Select
          value={selected.id}
          onValueChange={choose}
          items={organizations.map((organization) => ({
            value: organization.id,
            label: organization.name,
          }))}
        >
          <SelectTrigger className="w-full" aria-label="Elegir negocio">
            <SelectValue placeholder="Elegir negocio" />
          </SelectTrigger>
          <SelectContent>
            {organizations.map((organization) => (
              <SelectItem key={organization.id} value={organization.id}>
                {organization.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="truncate">{selected.name}</CardTitle>
            <CardDescription>
              {selected.slug} · los cambios aplican solo a este negocio
            </CardDescription>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetDefaults}
              disabled={pending}
            >
              <RotateCcwIcon />
              Defaults
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={enableAll}
              disabled={pending}
            >
              <CheckIcon />
              Todo
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {GROUPS.map((group) => {
            const features = FEATURE_CATALOG.filter(
              (feature) => feature.group === group
            )

            if (features.length === 0) return null

            return (
              <section key={group} className="flex flex-col gap-2">
                <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {FEATURE_GROUP_LABELS[group]}
                </h2>
                <div className="flex flex-col divide-y rounded-lg border">
                  {features.map((feature) => {
                    const enabled = draft[feature.key] ?? feature.default

                    return (
                      <div
                        key={feature.key}
                        className="flex items-center justify-between gap-4 px-3 py-2.5"
                      >
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            {feature.label}
                            {enabled !== feature.default ? (
                              <Badge variant="secondary" className="text-[10px]">
                                Override
                              </Badge>
                            ) : null}
                          </span>
                          {feature.path ? (
                            <span className="truncate text-xs text-muted-foreground">
                              {feature.path}
                            </span>
                          ) : null}
                        </div>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(value) =>
                            toggle(feature.key, value)
                          }
                          aria-label={`Activar ${feature.label}`}
                        />
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
