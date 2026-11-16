"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { CameraIcon } from "lucide-react"
import { toast } from "sonner"

import { createWaste, presignWastePhoto } from "@/app/(app)/waste/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  WASTE_REASONS,
  type WasteIngredient,
  type WasteReasonCode,
} from "@/lib/waste"

export function WasteForm({
  ingredients,
}: {
  ingredients: WasteIngredient[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [ingredientId, setIngredientId] = useState(ingredients[0]?.id ?? "")
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState<WasteReasonCode>("EXPIRED")
  const [note, setNote] = useState("")
  const [file, setFile] = useState<File | null>(null)

  const ingredient = ingredients.find((item) => item.id === ingredientId)

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const value = Number(quantity)
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Escribe una cantidad mayor que cero")
      return
    }

    startTransition(async () => {
      let photoKey: string | undefined

      // Si hay foto: se firma, se sube directo a R2 y se guarda solo la clave.
      if (file) {
        const presign = await presignWastePhoto(
          file.type || "image/jpeg",
          file.size
        )

        if (!presign.ok || !presign.data) {
          toast.error(presign.message ?? "No pudimos preparar la foto")
          return
        }

        const upload = await fetch(presign.data.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "image/jpeg" },
          body: file,
        }).catch(() => null)

        if (!upload?.ok) {
          toast.error("No pudimos subir la foto")
          return
        }

        photoKey = presign.data.key
      }

      const result = await createWaste({
        ingredientId,
        quantity,
        reason,
        note: note.trim() || undefined,
        photoKey,
      })

      if (!result.ok) {
        toast.error(result.message ?? "No pudimos registrar la merma")
        return
      }

      toast.success(
        `Merma registrada: $${Number(result.data?.cost ?? 0).toFixed(2)}`
      )
      setQuantity("")
      setNote("")
      setFile(null)
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar merma</CardTitle>
        <CardDescription>
          El costo se calcula con el costo actual del insumo al momento de
          guardar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <Field>
            <FieldLabel htmlFor="waste-ingredient">Insumo</FieldLabel>
            <select
              id="waste-ingredient"
              value={ingredientId}
              onChange={(event) => setIngredientId(event.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              required
            >
              {ingredients.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex flex-wrap gap-3">
            <Field className="w-32">
              <FieldLabel htmlFor="waste-quantity">Cantidad</FieldLabel>
              <Input
                id="waste-quantity"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="0"
                required
              />
            </Field>
            <Field className="w-40">
              <FieldLabel htmlFor="waste-reason">Motivo</FieldLabel>
              <select
                id="waste-reason"
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value as WasteReasonCode)
                }
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {WASTE_REASONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field className="min-w-40 flex-1">
              <FieldLabel htmlFor="waste-note">Nota (opcional)</FieldLabel>
              <Input
                id="waste-note"
                value={note}
                maxLength={280}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Se cayó la charola"
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="waste-photo">Foto (opcional)</FieldLabel>
            <div className="flex items-center gap-2">
              <Input
                id="waste-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="flex-1"
              />
              <CameraIcon className="size-4 text-muted-foreground" />
            </div>
          </Field>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {ingredient
                ? `Unidad: ${ingredient.displayUnit}`
                : "Selecciona un insumo"}
            </span>
            <Button type="submit" disabled={pending || !ingredientId}>
              {pending ? "Guardando..." : "Guardar merma"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
