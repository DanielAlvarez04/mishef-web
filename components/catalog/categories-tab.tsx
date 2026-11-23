"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Loader2Icon,
  PencilIcon,
  PlusIcon,
} from "lucide-react"
import { toast } from "sonner"

import { createCategory, updateCategory } from "@/app/(app)/catalog/actions"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useActionForm } from "@/hooks/use-action-form"
import type { Category } from "@/lib/catalog"
import { diffFields, isEmptyPatch, sameText } from "@/lib/diff"

/**
 * Pestaña de categorías de artículos.
 *
 * Cards simples, sin imagen ni icono de respaldo. Las categorías core solo
 * permiten personalizar su descripción; el nombre es compartido.
 */
export function CategoriesTab({
  categories,
  canManage,
}: {
  categories: Category[]
  canManage: boolean
}) {
  const router = useRouter()

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Category | null>(null)
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")

  const form = useActionForm(() => {
    setOpen(false)
    router.refresh()
  })

  function openCreate() {
    setEditing(null)
    setName("")
    setDescription("")
    form.setError(null)
    setOpen(true)
  }

  function openEdit(category: Category) {
    setEditing(category)
    setName(category.name)
    setDescription(category.description ?? "")
    form.setError(null)
    setOpen(true)
  }

  function save() {
    const trimmed = name.trim()

    if (trimmed.length < 2) {
      form.setError("El nombre debe tener al menos 2 caracteres")
      return
    }

    if (editing) {
      const patch = diffFields(
        {
          name: editing.name,
          description: editing.description ?? "",
        },
        {
          name: trimmed,
          description: description.trim(),
        },
        {
          name: (left, right) => sameText(left as string, right as string),
          description: (left, right) =>
            sameText(left as string, right as string),
        }
      )

      if (isEmptyPatch(patch)) {
        toast.info("Sin cambios")
        return
      }

      void form.run(() => updateCategory(editing.id, patch)).then((ok) => {
        if (ok) toast.success("Categoría actualizada")
      })
      return
    }

    const formData = new FormData()
    formData.set("name", trimmed)
    formData.set("description", description.trim())
    formData.set("kind", "ARTICLE")

    void form.run(() => createCategory(formData)).then((ok) => {
      if (ok) toast.success("Categoría creada")
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium">Categorías de artículos</h2>
          <p className="text-sm text-muted-foreground">
            Organiza el catálogo. Las categorías core son compartidas; puedes
            personalizar su descripción.
          </p>
        </div>
        {canManage ? (
          <Button type="button" onClick={openCreate}>
            <PlusIcon />
            Nueva categoría
          </Button>
        ) : null}
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          <p className="text-sm">Todavía no hay categorías de artículos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {categories.map((category) => {
            const count = category._count.items ?? 0

            return (
              <Card key={category.id} className="flex flex-col gap-3">
                <CardHeader className="gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="min-w-0 truncate text-base">
                      {category.name}
                    </CardTitle>
                    {category.isCore ? (
                      <Badge variant="outline">Core</Badge>
                    ) : null}
                  </div>
                  <CardDescription className="line-clamp-2 min-h-8">
                    {category.description || "Sin descripción"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="mt-auto flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {count} artículo{count === 1 ? "" : "s"}
                  </span>
                  {canManage ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(category)}
                    >
                      <PencilIcon className="size-4" />
                      Editar
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!form.pending) setOpen(next)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? editing.isCore
                  ? "Personalizar categoría core"
                  : "Editar categoría"
                : "Nueva categoría"}
            </DialogTitle>
            <DialogDescription>
              {editing?.isCore
                ? "El nombre es compartido y no se puede cambiar. La descripción es propia de tu negocio."
                : "El nombre es obligatorio; la descripción es opcional."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="category-name">Nombre</FieldLabel>
              <Input
                id="category-name"
                value={name}
                maxLength={80}
                autoFocus={!editing?.isCore}
                disabled={editing?.isCore || form.pending}
                onChange={(event) => setName(event.target.value)}
              />
              {editing?.isCore ? (
                <FieldDescription>
                  El nombre de las categorías core es el mismo para todos los
                  negocios.
                </FieldDescription>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="category-description">
                Descripción
              </FieldLabel>
              <Textarea
                id="category-description"
                value={description}
                maxLength={280}
                rows={3}
                placeholder="Para qué se usa esta categoría"
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>

            {form.error ? <FieldError>{form.error}</FieldError> : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={form.pending}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={form.pending} onClick={save}>
              {form.pending ? <Loader2Icon className="animate-spin" /> : null}
              {editing ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
