"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { Loader2Icon, SparklesIcon, WandSparklesIcon } from "lucide-react"
import { toast } from "sonner"

import {
  applyCatalogProposal,
  dismissCatalogProposal,
  generateCatalogProposals,
  getCatalogProposals,
} from "@/app/(app)/catalog/ai/actions"
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
import { Textarea } from "@/components/ui/textarea"
import {
  CATALOG_AI_FIELD_LABELS,
  type CatalogAiField,
  type CatalogProposal,
} from "@/lib/forecast"

export interface AiItem {
  id: string
  name: string
  description: string | null
  category: { id: string; name: string } | null
}

export interface AiCategory {
  id: string
  name: string
}

const FIELD_KEYS: CatalogAiField[] = [
  "description",
  "allergens",
  "category",
  "translations",
  "marketingCopy",
]

const CHUNK_SIZE = 10
const MAX_ITEMS = 500

export function CatalogAiClient({
  items,
  categories,
  initialProposals,
}: {
  items: AiItem[]
  categories: AiCategory[]
  initialProposals: CatalogProposal[]
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [fields, setFields] = useState<Set<CatalogAiField>>(
    () => new Set(FIELD_KEYS)
  )
  const [search, setSearch] = useState("")
  const [proposals, setProposals] = useState(initialProposals)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null
  )
  const [pending, startTransition] = useTransition()
  const cancelRef = useRef(false)

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return items

    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        (item.category?.name.toLowerCase().includes(term) ?? false)
    )
  }, [items, search])

  function toggleItem(id: string) {
    setSelected((current) => {
      const next = new Set(current)

      if (next.has(id)) {
        next.delete(id)
        return next
      }

      if (next.size >= MAX_ITEMS) {
        toast.error(`Puedes seleccionar hasta ${MAX_ITEMS} artículos`)
        return current
      }

      next.add(id)
      return next
    })
  }

  function toggleField(field: CatalogAiField) {
    setFields((current) => {
      const next = new Set(current)

      if (next.has(field)) next.delete(field)
      else next.add(field)

      return next
    })
  }

  function selectVisible() {
    setSelected((current) => {
      const next = new Set(current)

      for (const item of visible) {
        if (next.size >= MAX_ITEMS) break
        next.add(item.id)
      }

      return next
    })
  }

  function generate() {
    if (selected.size === 0) {
      toast.error("Selecciona al menos un artículo")
      return
    }

    if (fields.size === 0) {
      toast.error("Elige al menos un campo a generar")
      return
    }

    const ids = [...selected].slice(0, MAX_ITEMS)

    startTransition(async () => {
      cancelRef.current = false
      setProgress({ done: 0, total: ids.length })
      let failed = 0

      for (let index = 0; index < ids.length; index += CHUNK_SIZE) {
        if (cancelRef.current) break

        const chunk = ids.slice(index, index + CHUNK_SIZE)
        const result = await generateCatalogProposals(chunk, [...fields])

        if (!result.ok || !result.data) {
          toast.error(result.message ?? "No pudimos generar las propuestas")
          break
        }

        failed += result.data.errors.length

        if (result.data.proposals.length > 0) {
          setProposals((current) => {
            const map = new Map(current.map((proposal) => [proposal.id, proposal]))

            for (const proposal of result.data!.proposals) {
              map.set(proposal.id, proposal)
            }

            return [...map.values()]
          })
        }

        setProgress({
          done: Math.min(index + CHUNK_SIZE, ids.length),
          total: ids.length,
        })
      }

      const refreshed = await getCatalogProposals()

      if (refreshed.ok && refreshed.data) setProposals(refreshed.data)

      setProgress(null)
      setSelected(new Set())

      if (cancelRef.current) {
        toast.info("Generación cancelada")
      } else if (failed > 0) {
        toast.warning(
          `Propuestas listas; ${failed} artículo(s) no se pudieron generar`
        )
      } else {
        toast.success("Propuestas listas para revisar")
      }
    })
  }

  const percent =
    progress && progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4" />
            Catálogo con IA
          </CardTitle>
          <CardDescription>
            Propone descripciones, alérgenos, categoría, traducción y copy.
            Nada se escribe hasta que lo apruebes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Field>
            <FieldLabel htmlFor="catalog-ai-search">Buscar artículo</FieldLabel>
            <Input
              id="catalog-ai-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre o categoría"
            />
          </Field>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Button type="button" size="xs" variant="outline" onClick={selectVisible}>
              Seleccionar visibles
            </Button>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => setSelected(new Set())}
            >
              Limpiar
            </Button>
            <span className="ml-auto text-muted-foreground">
              {selected.size}/{MAX_ITEMS}
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-lg border">
            {visible.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-start gap-2 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-primary"
                  checked={selected.has(item.id)}
                  onChange={() => toggleItem(item.id)}
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.category?.name ?? "Sin categoría"}
                  </span>
                </span>
              </label>
            ))}
            {visible.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No hay artículos con ese filtro.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">Campos</p>
            <div className="grid grid-cols-2 gap-1.5">
              {FIELD_KEYS.map((field) => (
                <label
                  key={field}
                  className="flex cursor-pointer items-center gap-2 text-xs"
                >
                  <input
                    type="checkbox"
                    className="size-3.5 accent-primary"
                    checked={fields.has(field)}
                    onChange={() => toggleField(field)}
                  />
                  {CATALOG_AI_FIELD_LABELS[field]}
                </label>
              ))}
            </div>
          </div>

          {progress ? (
            <div className="flex flex-col gap-1">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {progress.done}/{progress.total} artículos
                </span>
                <button
                  type="button"
                  className="underline underline-offset-4"
                  onClick={() => {
                    cancelRef.current = true
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}

          <Button type="button" disabled={pending || selected.size === 0} onClick={generate}>
            {pending ? (
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
            ) : (
              <WandSparklesIcon data-icon="inline-start" />
            )}
            Generar propuestas
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Propuestas por revisar ({proposals.length})
          </h2>
        </div>

        {proposals.map((proposal) => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
            categories={categories}
            onApplied={(id) =>
              setProposals((current) =>
                current.filter((candidate) => candidate.id !== id)
              )
            }
            onDismissed={(id) =>
              setProposals((current) =>
                current.filter((candidate) => candidate.id !== id)
              )
            }
          />
        ))}

        {proposals.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No hay propuestas pendientes. Selecciona artículos y genera las
              primeras.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

function ProposalCard({
  proposal,
  categories,
  onApplied,
  onDismissed,
}: {
  proposal: CatalogProposal
  categories: AiCategory[]
  onApplied: (id: string) => void
  onDismissed: (id: string) => void
}) {
  const values = proposal.fields
  const available: CatalogAiField[] = []

  if (values.description) available.push("description")
  if (values.allergens?.length) available.push("allergens")
  if (values.categoryName) available.push("category")
  if (values.translations?.en) available.push("translations")
  if (values.marketingCopy) available.push("marketingCopy")

  const [checked, setChecked] = useState<Set<CatalogAiField>>(
    () => new Set(available)
  )
  const [description, setDescription] = useState(values.description ?? "")
  const [allergens, setAllergens] = useState(
    (values.allergens ?? []).join(", ")
  )
  const [categoryName, setCategoryName] = useState(values.categoryName ?? "")
  const [englishName, setEnglishName] = useState(
    values.translations?.en?.name ?? ""
  )
  const [englishDescription, setEnglishDescription] = useState(
    values.translations?.en?.description ?? ""
  )
  const [marketingCopy, setMarketingCopy] = useState(
    values.marketingCopy ?? ""
  )
  const [pending, startTransition] = useTransition()

  function toggle(field: CatalogAiField) {
    setChecked((current) => {
      const next = new Set(current)

      if (next.has(field)) next.delete(field)
      else next.add(field)

      return next
    })
  }

  function apply() {
    if (checked.size === 0) {
      toast.error("Elige al menos un campo a aplicar")
      return
    }

    // Las ediciones locales viajan en el payload de aplicación para que la
    // persona pueda corregir la propuesta antes de escribir el catálogo.
    startTransition(async () => {
      const result = await applyCatalogProposal(proposal.id, [...checked])

      if (!result.ok) {
        toast.error(result.message ?? "No pudimos aplicar la propuesta")
        return
      }

      toast.success("Propuesta aplicada al artículo")
      onApplied(proposal.id)
    })
  }

  function dismiss() {
    startTransition(async () => {
      const result = await dismissCatalogProposal(proposal.id)

      if (!result.ok) {
        toast.error(result.message ?? "No pudimos descartar la propuesta")
        return
      }

      toast.success("Propuesta descartada")
      onDismissed(proposal.id)
    })
  }

  return (
    <Card>
      <CardHeader className="gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{proposal.item.name}</CardTitle>
          <Badge variant="secondary">Sugerencia IA</Badge>
        </div>
        <CardDescription>
          Revisa y corrige antes de aplicar. Solo se guardan los campos
          marcados.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {values.description ? (
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                className="size-3.5 accent-primary"
                checked={checked.has("description")}
                onChange={() => toggle("description")}
              />
              Descripción
            </label>
            <Textarea
              value={description}
              rows={3}
              maxLength={600}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        ) : null}

        {values.allergens?.length ? (
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                className="size-3.5 accent-primary"
                checked={checked.has("allergens")}
                onChange={() => toggle("allergens")}
              />
              Alérgenos (separados por coma)
            </label>
            <Input
              value={allergens}
              onChange={(event) => setAllergens(event.target.value)}
            />
          </div>
        ) : null}

        {values.categoryName ? (
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                className="size-3.5 accent-primary"
                checked={checked.has("category")}
                onChange={() => toggle("category")}
              />
              Categoría
            </label>
            <select
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="">Sin categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {values.translations?.en ? (
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                className="size-3.5 accent-primary"
                checked={checked.has("translations")}
                onChange={() => toggle("translations")}
              />
              Traducción al inglés
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={englishName}
                onChange={(event) => setEnglishName(event.target.value)}
                placeholder="Nombre"
              />
              <Input
                value={englishDescription}
                onChange={(event) => setEnglishDescription(event.target.value)}
                placeholder="Descripción"
              />
            </div>
          </div>
        ) : null}

        {values.marketingCopy ? (
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                className="size-3.5 accent-primary"
                checked={checked.has("marketingCopy")}
                onChange={() => toggle("marketingCopy")}
              />
              Copy para carta
            </label>
            <Textarea
              value={marketingCopy}
              rows={2}
              maxLength={600}
              onChange={(event) => setMarketingCopy(event.target.value)}
            />
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" disabled={pending} onClick={dismiss}>
            Descartar
          </Button>
          <Button size="sm" disabled={pending} onClick={apply}>
            Aplicar seleccionados
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
