"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
  Loader2Icon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import {
  createIngredient,
  getIngredientPos,
  saveIngredientPos,
  updateIngredient,
  type IngredientPosInput,
  type IngredientUpdateInput,
} from "@/app/(app)/inventory/actions"
import { ImageDropzone } from "@/components/catalog/image-dropzone"
import { Button } from "@/components/ui/button"
import { ClearFieldsButton } from "@/components/ui/clear-fields-button"
import { MediaGallery } from "@/components/media/media-gallery"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UnitOptions } from "@/components/ui/unit-options"
import { useActionForm } from "@/hooks/use-action-form"
import {
  convertUnitValue,
  UNIT_SELECT_ITEMS,
  unitLabel,
  unitsOfDimension,
  type Category,
  type Ingredient,
  type IngredientCategory,
  type IngredientLocation,
  type UnitCode,
} from "@/lib/catalog"
import { useCurrency } from "@/lib/currency"
import { clearDraft, formValues, readDraft, writeDraft } from "@/lib/drafts"
import { isCoreProductName } from "@/lib/core-products"
import { isEmptyPatch, sameNumber, sameText } from "@/lib/diff"
import { uploadItemImage } from "@/lib/uploads"

export function IngredientDialog({
  open,
  onOpenChange,
  ingredient,
  categories = [],
  locations = [],
  articleCategories = [],
  branchName = null,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ingredient?: Ingredient | null
  categories: IngredientCategory[]
  locations: IngredientLocation[]
  /** Categorías de artículo para publicar el insumo en el POS. */
  articleCategories?: Category[]
  /** Sucursal donde se registra el stock inicial; `null` = organización. */
  branchName?: string | null
}) {
  const router = useRouter()
  const currency = useCurrency()
  const isEdit = Boolean(ingredient)
  const isOrgView = branchName === null
  const [formError, setFormError] = useState<string | null>(null)

  // Borrador: lo que se escribe se guarda al cerrar y se recupera al reabrir.
  // Se descarta solo cuando el formulario se guarda con éxito.
  const draftKey = ingredient ? `ingredient:${ingredient.id}` : "ingredient:new"
  const [draft, setDraft] = useState(() =>
    readDraft<Record<string, string>>(draftKey)
  )
  const formRef = useRef<HTMLFormElement>(null)
  // Cambiar la clave remonta el formulario: así los campos no controlados
  // vuelven a su `defaultValue` cuando se limpian.
  const [formKey, setFormKey] = useState(0)

  // Publicación del insumo como artículo del POS.
  interface PosRow {
    key: string
    name: string
    price: string
  }

  const [posEnabled, setPosEnabled] = useState(
    Boolean(ingredient?.soldItemId)
  )
  const [posCategoryId, setPosCategoryId] = useState("")
  const [posPrice, setPosPrice] = useState("")
  const [posPresentations, setPosPresentations] = useState<PosRow[]>([])
  const [posImageFile, setPosImageFile] = useState<File | null>(null)
  const [posImagePreview, setPosImagePreview] = useState<string | null>(null)

  useEffect(() => {
    if (!ingredient?.id) return

    let cancelled = false

    void getIngredientPos(ingredient.id).then((result) => {
      if (cancelled || !result.ok || !result.data) return

      setPosEnabled(true)
      setPosCategoryId(result.data.categoryId ?? "")
      setPosPrice(String(result.data.price))
      setPosPresentations(
        (result.data.presentations ?? []).map((presentation, index) => ({
          key: `pos-${index}`,
          name: presentation.name,
          price: String(presentation.price),
        }))
      )
    })

    return () => {
      cancelled = true
    }
  }, [ingredient?.id])

  useEffect(() => {
    return () => {
      if (posImagePreview) URL.revokeObjectURL(posImagePreview)
    }
  }, [posImagePreview])

  const { pending, error, run } = useActionForm(() => {
    clearDraft(draftKey)
    onOpenChange(false)
    router.refresh()
  })

  // Unidad visible: se puede cambiar en cualquier momento. La API guarda los
  // valores en la unidad canónica de la dimensión, así que no se reescriben.
  const [displayUnit, setDisplayUnit] = useState<UnitCode>(
    (draft?.displayUnit as UnitCode | undefined) ??
      ingredient?.displayUnit ??
      "UNIT"
  )
  const unitSymbol = unitLabel(displayUnit)
  // Los insumos core conservan el nombre y la categoría sugeridos.
  const coreLocked = Boolean(ingredient && isCoreProductName(ingredient.name))
  // Al editar solo se ofrecen unidades de la misma dimensión: la API rechaza
  // cambiar de masa a volumen o conteo.
  const unitChoices = isEdit
    ? unitsOfDimension(ingredient?.displayUnit ?? "UNIT")
    : undefined
  const unitItems = unitChoices
    ? unitChoices.map((unit) => ({ value: unit.code, label: unit.symbol }))
    : UNIT_SELECT_ITEMS

  const categoryItems = categories
    .filter((c) => c.isActive)
    .map((c) => ({ value: c.id, label: c.name }))

  const locationItems = locations
    .filter((l) => l.isActive)
    .map((l) => ({ value: l.id, label: l.name }))

  /** Guarda lo escrito antes de cerrar para poder recuperarlo al reabrir. */
  function handleOpenChange(next: boolean) {
    if (!next && formRef.current) {
      writeDraft(draftKey, { ...formValues(formRef.current), displayUnit })
    }

    onOpenChange(next)
  }

  /** Devuelve los campos a su valor inicial y descarta el borrador. */
  function handleClear() {
    clearDraft(draftKey)
    setDraft(null)
    setDisplayUnit(ingredient?.displayUnit ?? "UNIT")
    setFormError(null)
    setFormKey((key) => key + 1)
  }

  /**
   * Cambiar la unidad visible no toca la BD, pero los valores del formulario se
   * reescriben para que representen la misma cantidad física.
   */
  function handleUnitChange(next: UnitCode) {
    if (next === displayUnit) return

    const form = formRef.current

    if (form) {
      const values = formValues(form)

      const quantities = ["minStock", "maxStock"]
      for (const field of quantities) {
        const raw = values[field]
        if (!raw) continue
        const parsed = Number(raw.replace(",", "."))
        if (!Number.isFinite(parsed)) continue
        const converted = convertUnitValue(parsed, displayUnit, next)
        if (converted !== null) values[field] = String(converted)
      }

      if (values.unitCost) {
        const parsed = Number(values.unitCost.replace(",", "."))
        // El costo por unidad se mueve al revés que la cantidad.
        const converted = Number.isFinite(parsed)
          ? convertUnitValue(parsed, next, displayUnit)
          : null
        if (converted !== null) values.unitCost = String(converted)
      }

      setDraft(values)
    }

    setDisplayUnit(next)
    setFormKey((key) => key + 1)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Editar ${ingredient?.name}` : "Nuevo insumo"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "El stock solo cambia con ajustes auditables, no editando el insumo."
              : branchName
                ? `El stock inicial se registra en ${branchName} como un movimiento de ajuste.`
                : "En la vista de organización no se puede definir stock inicial. Use una sucursal para dar de alta stock."}
          </DialogDescription>
        </DialogHeader>

        <form
          key={`${ingredient?.id ?? "nuevo"}-${formKey}`}
          ref={formRef}
          onSubmit={(event) => {
            event.preventDefault()
            const formData = new FormData(event.currentTarget)

            const name = String(formData.get("name") ?? "").trim()
            if (!name) {
              setFormError("Escribe el nombre del insumo.")
              return
            }

            if (!formData.get("displayUnit")) {
              setFormError("Selecciona la unidad.")
              return
            }

            if (!formData.get("categoryId")) {
              setFormError("Selecciona una categoría.")
              return
            }

            const price = Number(posPrice.replace(",", "."))
            let pos: IngredientPosInput | undefined

            if (posEnabled) {
              if (!posCategoryId) {
                setFormError("Selecciona la categoría del artículo.")
                return
              }

              if (!Number.isFinite(price) || price <= 0) {
                setFormError("Escribe el precio de venta del artículo.")
                return
              }

              const presentations = []

              for (const row of posPresentations) {
                const presentationName = row.name.trim()
                if (!presentationName) continue

                const presentationPrice = Number(
                  row.price.replace(",", ".")
                )

                if (
                  !Number.isFinite(presentationPrice) ||
                  presentationPrice < 0
                ) {
                  setFormError(
                    `El precio de "${presentationName}" no es válido.`
                  )
                  return
                }

                presentations.push({
                  name: presentationName,
                  price: presentationPrice,
                })
              }

              pos = {
                categoryId: posCategoryId,
                price,
                ...(presentations.length > 0 ? { presentations } : {}),
              }
            }

            setFormError(null)

            async function uploadPosImage(itemId: string) {
              if (!posImageFile) return

              const upload = await uploadItemImage(itemId, posImageFile)

              if (!upload.ok) {
                toast.error(
                  upload.message ?? "No se pudo subir la imagen del artículo"
                )
              }
            }

            if (!ingredient) {
              run(async () => {
                const result = await createIngredient(formData, pos)

                if (result.ok && result.data?.soldItemId) {
                  await uploadPosImage(result.data.soldItemId)
                }

                return result
              })
              return
            }

            const readNumber = (key: string) => {
              const raw = String(formData.get(key) ?? "").trim()
              if (!raw) return undefined
              const parsed = Number(raw.replace(",", "."))
              return Number.isFinite(parsed) ? parsed : undefined
            }

            const nextDisplayUnit = String(
              formData.get("displayUnit") ?? ""
            ) as UnitCode
            const nextCategoryId = String(
              formData.get("categoryId") ?? ""
            ).trim()
            const nextLocationId = String(
              formData.get("locationId") ?? ""
            ).trim()
            const minStock = readNumber("minStock")
            const maxStock = readNumber("maxStock")
            const unitCost = readNumber("unitCost")

            // Solo se envían los campos que cambiaron respecto al insumo.
            const changes: Partial<IngredientUpdateInput> = {
              ...(sameText(ingredient.name, name) ? {} : { name }),
              ...(ingredient.displayUnit === nextDisplayUnit
                ? {}
                : { displayUnit: nextDisplayUnit }),
              ...((ingredient.category?.id ?? "") === nextCategoryId
                ? {}
                : { categoryId: nextCategoryId }),
              ...((ingredient.location?.id ?? "") === nextLocationId
                ? {}
                : { locationId: nextLocationId }),
              ...(minStock === undefined ||
              sameNumber(ingredient.minStock, minStock)
                ? {}
                : { minStock }),
              ...(maxStock === undefined ||
              sameNumber(ingredient.maxStock, maxStock)
                ? {}
                : { maxStock }),
              ...(unitCost === undefined ||
              sameNumber(ingredient.unitCost, unitCost)
                ? {}
                : { unitCost }),
            }

            if (isEmptyPatch(changes) && !pos) {
              toast.info("Sin cambios")
              onOpenChange(false)
              return
            }

            run(async () => {
              if (!isEmptyPatch(changes)) {
                const updated = await updateIngredient(
                  ingredient.id,
                  changes
                )

                if (!updated.ok) return updated
              }

              if (pos) {
                const saved = await saveIngredientPos(ingredient.id, pos)

                if (!saved.ok) return saved

                if (saved.data?.itemId) {
                  await uploadPosImage(saved.data.itemId)
                }
              }

              return { ok: true }
            })
          }}
        >
          <div className="flex flex-col gap-4">
            {!ingredient?.soldItemId ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Guardar como
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant={posEnabled ? "outline" : "default"}
                  onClick={() => setPosEnabled(false)}
                >
                  Insumo
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={posEnabled ? "default" : "outline"}
                  onClick={() => setPosEnabled(true)}
                >
                  Insumo + POS
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Este insumo también se vende como artículo en el POS.
              </p>
            )}

            {/* Fila 1: Nombre y Unidad */}
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="ingredient-name">
                  Nombre <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="ingredient-name"
                  name="name"
                  defaultValue={draft?.name ?? ingredient?.name ?? ""}
                  required
                  maxLength={120}
                  placeholder="Leche entera"
                  disabled={coreLocked}
                />
                {coreLocked ? (
                  <p className="text-xs text-muted-foreground">
                    El nombre de un insumo sugerido no se puede editar.
                  </p>
                ) : null}
              </Field>

              <Field>
                <FieldLabel htmlFor="ingredient-unit">
                  Unidad <span className="text-destructive">*</span>
                </FieldLabel>
                <Select
                  name="displayUnit"
                  value={displayUnit}
                  onValueChange={(value) =>
                    handleUnitChange((value as UnitCode) ?? "UNIT")
                  }
                  items={unitItems}
                >
                  <SelectTrigger
                    id="ingredient-unit"
                    className="w-full"
                    aria-label="Unidad"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <UnitOptions dimension={unitChoices?.[0]?.dimension} />
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* Fila 2: Categoría y Ubicación */}
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="ingredient-category">
                  Categoría <span className="text-destructive">*</span>
                </FieldLabel>
                <Select
                  name="categoryId"
                  defaultValue={draft?.categoryId ?? ingredient?.category?.id ?? ""}
                  items={categoryItems}
                  disabled={coreLocked}
                >
                  <SelectTrigger
                    id="ingredient-category"
                    className="w-full"
                    aria-label="Categoría"
                  >
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryItems.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="ingredient-location">Ubicación</FieldLabel>
                <Select
                  name="locationId"
                  defaultValue={draft?.locationId ?? ingredient?.location?.id ?? ""}
                  items={[{ value: "", label: "Sin ubicación" }, ...locationItems]}
                >
                  <SelectTrigger
                    id="ingredient-location"
                    className="w-full"
                    aria-label="Ubicación"
                  >
                    <SelectValue placeholder="Seleccionar ubicación" />
                  </SelectTrigger>
                  <SelectContent>
                    {locationItems.map((loc) => (
                      <SelectItem key={loc.value} value={loc.value}>
                        {loc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* Fila 3: Stock inicial (nuevo) / Stock actual (editar) y Costo unitario */}
            {!isOrgView && (
              <div className="grid grid-cols-2 gap-3">
                {isEdit ? (
                  <Field data-disabled>
                    <FieldLabel htmlFor="ingredient-current-stock">
                      Stock actual
                    </FieldLabel>
                    <InputGroup
                      className="bg-muted dark:bg-muted"
                      data-disabled
                    >
                      <InputGroupInput
                        id="ingredient-current-stock"
                        type="number"
                        min="0"
                        value={ingredient?.currentStock ?? "0"}
                        readOnly
                        className="cursor-not-allowed"
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupText>{unitSymbol}</InputGroupText>
                      </InputGroupAddon>
                    </InputGroup>
                  </Field>
                ) : (
                  <Field>
                    <FieldLabel htmlFor="ingredient-stock">
                      Stock inicial
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        id="ingredient-stock"
                        name="currentStock"
                        type="number"
                        min="0"
                        placeholder="0"
                        defaultValue={draft?.currentStock ?? ""}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupText>{unitSymbol}</InputGroupText>
                      </InputGroupAddon>
                    </InputGroup>
                  </Field>
                )}

                <Field>
                  <FieldLabel htmlFor="ingredient-unit-cost">
                    Costo unitario
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupAddon align="inline-start">
                      <InputGroupText>$</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      id="ingredient-unit-cost"
                      name="unitCost"
                      type="number"
                      min="0"
                      placeholder="0"
                      defaultValue={draft?.unitCost ?? ingredient?.unitCost ?? ""}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>{currency}</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
              </div>
            )}

            {/* Fila 3 alternativa (vista org): solo Costo unitario (full width) */}
            {isOrgView && (
              <Field>
                <FieldLabel htmlFor="ingredient-unit-cost">
                  Costo unitario
                </FieldLabel>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <InputGroupText>$</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    id="ingredient-unit-cost"
                    name="unitCost"
                    type="number"
                    min="0"
                    placeholder="0"
                    defaultValue={draft?.unitCost ?? ingredient?.unitCost ?? ""}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>{currency}</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            )}

            {/* Fila 4: Stock mínimo y Stock máximo (ocultar en vista org) */}
            {!isOrgView && (
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="ingredient-min">Stock mínimo</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="ingredient-min"
                      name="minStock"
                      type="number"
                      min="0"
                      placeholder="0"
                      defaultValue={draft?.minStock ?? ingredient?.minStock ?? ""}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>{unitSymbol}</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>

                <Field>
                  <FieldLabel htmlFor="ingredient-max-stock">
                    Stock máximo
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="ingredient-max-stock"
                      name="maxStock"
                      type="number"
                      min="0"
                      placeholder="0"
                      defaultValue={draft?.maxStock ?? ingredient?.maxStock ?? ""}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>{unitSymbol}</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
              </div>
            )}

            {posEnabled ? (
              <div className="flex flex-col gap-3 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Artículo en el POS</p>
                  <p className="text-xs text-muted-foreground">
                    Se crea una receta que descuenta 1 {unitSymbol} del insumo
                    por cada venta.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
                  <div className="h-40">
                    <ImageDropzone
                      url={posImagePreview}
                      onSelect={(file) => {
                        if (posImagePreview) {
                          URL.revokeObjectURL(posImagePreview)
                        }
                        setPosImageFile(file)
                        setPosImagePreview(URL.createObjectURL(file))
                      }}
                      onRemove={() => {
                        if (posImagePreview) {
                          URL.revokeObjectURL(posImagePreview)
                        }
                        setPosImageFile(null)
                        setPosImagePreview(null)
                      }}
                      disabled={pending}
                    />
                  </div>

                  <div className="grid content-start gap-3">
                    <Field>
                      <FieldLabel htmlFor="ingredient-pos-category">
                        Categoría del artículo{" "}
                        <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Select
                        value={posCategoryId}
                        onValueChange={(value) => {
                          if (value) setPosCategoryId(value)
                        }}
                        items={articleCategories
                          .filter((category) => category.isActive)
                          .map((category) => ({
                            value: category.id,
                            label: category.name,
                          }))}
                      >
                        <SelectTrigger
                          id="ingredient-pos-category"
                          className="w-full"
                          aria-label="Categoría del artículo"
                        >
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {articleCategories
                            .filter((category) => category.isActive)
                            .map((category) => (
                              <SelectItem
                                key={category.id}
                                value={category.id}
                              >
                                {category.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="ingredient-pos-price">
                        Precio de venta{" "}
                        <span className="text-destructive">*</span>
                      </FieldLabel>
                      <InputGroup>
                        <InputGroupAddon align="inline-start">
                          <InputGroupText>$</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                          id="ingredient-pos-price"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          value={posPrice}
                          onChange={(event) =>
                            setPosPrice(event.target.value)
                          }
                        />
                        <InputGroupAddon align="inline-end">
                          <InputGroupText>{currency}</InputGroupText>
                        </InputGroupAddon>
                      </InputGroup>
                    </Field>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Presentaciones
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setPosPresentations((current) => [
                          ...current,
                          {
                            key: Math.random().toString(36).slice(2),
                            name: "",
                            price: posPrice,
                          },
                        ])
                      }
                    >
                      <PlusIcon />
                      Agregar
                    </Button>
                  </div>

                  {posPresentations.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Opcional. Agrega variantes como sabores o tamaños.
                    </p>
                  ) : (
                    posPresentations.map((row, index) => (
                      <div
                        key={row.key}
                        className="grid grid-cols-[minmax(0,1fr)_7rem_auto] items-center gap-2"
                      >
                        <Input
                          aria-label={`Nombre de la presentación ${index + 1}`}
                          placeholder="Ej. Coca-Cola"
                          value={row.name}
                          onChange={(event) =>
                            setPosPresentations((current) =>
                              current.map((item) =>
                                item.key === row.key
                                  ? { ...item, name: event.target.value }
                                  : item
                              )
                            )
                          }
                        />
                        <Input
                          aria-label={`Precio de la presentación ${index + 1}`}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          value={row.price}
                          onChange={(event) =>
                            setPosPresentations((current) =>
                              current.map((item) =>
                                item.key === row.key
                                  ? { ...item, price: event.target.value }
                                  : item
                              )
                            )
                          }
                        />
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Quitar presentación"
                          onClick={() =>
                            setPosPresentations((current) =>
                              current.filter((item) => item.key !== row.key)
                            )
                          }
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground">
              {isEdit
                ? `SKU: ${ingredient?.sku ?? "—"}. Cambiar la categoría genera un SKU nuevo.`
                : "El SKU se genera automáticamente según la categoría (ej. FVE100)."}
            </p>
            {formError ? <FieldError>{formError}</FieldError> : null}
            {error ? <FieldError>{error}</FieldError> : null}

            {ingredient?.id ? (
              <MediaGallery
                entityType="INGREDIENT"
                entityId={ingredient.id}
                disabled={pending}
                title="Imágenes y video del insumo"
              />
            ) : null}

            <DialogFooter>
              {!isEdit ? (
                <ClearFieldsButton
                  onClick={handleClear}
                  disabled={pending}
                  className="sm:mr-auto"
                />
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <SaveIcon />
                )}
                {isEdit ? "Guardar cambios" : "Crear insumo"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
