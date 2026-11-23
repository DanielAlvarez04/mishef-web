"use client"

import { useEffect, useState, useTransition } from "react"
import {
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  RotateCcwIcon,
  TagsIcon,
  Trash2Icon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  createSupplier,
  createSupplierProduct,
  deactivateSupplier,
  deleteSupplierProduct,
  getSupplierProducts,
  updateSupplier,
  type SupplierInput,
} from "@/app/(app)/suppliers/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  UNIT_CODES,
  unitLabel,
  type Ingredient,
  type UnitCode,
} from "@/lib/catalog"
import { sameNumber, sameStringSet, sameText } from "@/lib/diff"
import type { Supplier, SupplierProduct } from "@/lib/purchases"

export function SuppliersClient({
  suppliers,
  ingredients,
  canManage,
}: {
  suppliers: Supplier[]
  ingredients: Ingredient[]
  canManage: boolean
}) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [productsFor, setProductsFor] = useState<Supplier | null>(null)
  const [deactivating, setDeactivating] = useState<Supplier | null>(null)
  const [pending, startTransition] = useTransition()

  const active = suppliers.filter((supplier) => supplier.isActive)
  const inactive = suppliers.filter((supplier) => !supplier.isActive)

  function deactivate(supplier: Supplier) {
    startTransition(async () => {
      const result = await deactivateSupplier(supplier.id)

      if (!result.ok) {
        toast.error(result.message ?? "No pudimos desactivar el proveedor")
        return
      }

      toast.success("Proveedor desactivado")
      setDeactivating(null)
      router.refresh()
    })
  }

  function reactivate(supplier: Supplier) {
    startTransition(async () => {
      const result = await updateSupplier(supplier.id, { isActive: true })

      if (!result.ok) {
        toast.error(result.message ?? "No pudimos reactivar el proveedor")
        return
      }

      toast.success("Proveedor reactivado")
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Proveedores</h1>
          <p className="text-sm text-muted-foreground">
            Los proveedores y sus productos enseñan a la IA a mapear los
            tickets a tus insumos.
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => setCreating(true)}>
            <PlusIcon data-icon="inline-start" />
            Nuevo proveedor
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Proveedor</th>
              <th className="px-4 py-2 font-medium">RFC</th>
              <th className="px-4 py-2 font-medium">Alias</th>
              <th className="px-4 py-2 text-right font-medium">Productos</th>
              <th className="px-4 py-2 text-right font-medium">Compras</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              {canManage ? <th className="px-4 py-2" /> : null}
            </tr>
          </thead>
          <tbody>
            {[...active, ...inactive].map((supplier) => (
              <tr key={supplier.id} className="border-t">
                <td className="px-4 py-2 font-medium">{supplier.name}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {supplier.rfc ?? "—"}
                </td>
                <td className="max-w-56 truncate px-4 py-2 text-muted-foreground">
                  {supplier.aliases.length > 0 ? supplier.aliases.join(", ") : "—"}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {supplier._count?.products ?? 0}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {supplier._count?.purchases ?? 0}
                </td>
                <td className="px-4 py-2">
                  <Badge variant={supplier.isActive ? "success" : "secondary"}>
                    {supplier.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </td>
                {canManage ? (
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setProductsFor(supplier)}
                      >
                        <TagsIcon data-icon="inline-start" />
                        Productos
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(supplier)}
                      >
                        <PencilIcon data-icon="inline-start" />
                        Editar
                      </Button>
                      {supplier.isActive ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() => setDeactivating(supplier)}
                        >
                          <PowerIcon data-icon="inline-start" />
                          Desactivar
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() => reactivate(supplier)}
                        >
                          <RotateCcwIcon data-icon="inline-start" />
                          Reactivar
                        </Button>
                      )}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
            {suppliers.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? 7 : 6}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Aún no hay proveedores. Crea el primero para empezar a mapear
                  tickets.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {canManage ? (
        <>
          <SupplierDialog
            open={creating}
            onOpenChange={setCreating}
            title="Nuevo proveedor"
            description="Se usa para reconocer el ticket y aprender sus productos."
            onSubmit={async (input) => {
              const result = await createSupplier(input)

              if (!result.ok) {
                toast.error(result.message ?? "No pudimos crear el proveedor")
                return false
              }

              toast.success("Proveedor creado")
              router.refresh()
              return true
            }}
          />

          <SupplierDialog
            open={editing !== null}
            onOpenChange={(open) => {
              if (!open) setEditing(null)
            }}
            title="Editar proveedor"
            description="Solo se envían los campos que cambian."
            supplier={editing ?? undefined}
            onSubmit={async (input, supplier) => {
              if (!supplier) return false

              const patch: Partial<SupplierInput> = {}

              if (!sameText(input.name, supplier.name)) {
                patch.name = input.name.trim()
              }

              const rfc = input.rfc?.trim() || null
              if (!sameText(rfc, supplier.rfc)) patch.rfc = rfc

              const aliases = input.aliases ?? []
              if (!sameStringSet(aliases, supplier.aliases)) {
                patch.aliases = aliases
              }

              const rate =
                input.defaultTaxRate === null || input.defaultTaxRate === undefined
                  ? null
                  : input.defaultTaxRate
              if (!sameNumber(rate, supplier.defaultTaxRate)) {
                patch.defaultTaxRate = rate
              }

              if (Object.keys(patch).length === 0) {
                toast.info("Sin cambios")
                return false
              }

              const result = await updateSupplier(supplier.id, patch)

              if (!result.ok) {
                toast.error(result.message ?? "No pudimos guardar el proveedor")
                return false
              }

              toast.success("Proveedor actualizado")
              router.refresh()
              return true
            }}
          />

          <SupplierProductsDialog
            supplier={productsFor}
            ingredients={ingredients}
            onClose={() => setProductsFor(null)}
          />

          <AlertDialog
            open={deactivating !== null}
            onOpenChange={(open) => {
              if (!open) setDeactivating(null)
            }}
          >
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20">
                  <PowerIcon />
                </AlertDialogMedia>
                <AlertDialogTitle>
                  ¿Desactivar a {deactivating?.name}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Dejará de aparecer al revisar tickets nuevos. Las compras y
                  mapeos anteriores se conservan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={pending}
                  onClick={() => {
                    if (deactivating) deactivate(deactivating)
                  }}
                >
                  Desactivar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </div>
  )
}

function parseAliases(value: string | undefined): string[] {
  return Array.from(
    new Set(
      (value ?? "")
        .split(",")
        .map((alias) => alias.trim())
        .filter(Boolean)
    )
  ).slice(0, 30)
}

function SupplierDialog({
  open,
  onOpenChange,
  title,
  description,
  supplier,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  supplier?: Supplier
  onSubmit: (
    input: SupplierInput,
    supplier?: Supplier
  ) => Promise<boolean>
}) {
  const [name, setName] = useState("")
  const [rfc, setRfc] = useState("")
  const [aliases, setAliases] = useState("")
  const [taxPercent, setTaxPercent] = useState("")
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return

    setName(supplier?.name ?? "")
    setRfc(supplier?.rfc ?? "")
    setAliases(supplier?.aliases.join(", ") ?? "")
    setTaxPercent(
      supplier?.defaultTaxRate === null || supplier?.defaultTaxRate === undefined
        ? ""
        : String(Number(supplier.defaultTaxRate) * 100)
    )
  }, [open, supplier])

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const input: SupplierInput = {
      name: name.trim(),
      rfc: rfc.trim() || null,
      aliases: parseAliases(aliases),
      defaultTaxRate:
        taxPercent.trim() === "" ? null : Number(taxPercent) / 100,
    }

    if (input.name.length < 2) {
      toast.error("Escribe el nombre del proveedor")
      return
    }

    startTransition(async () => {
      const ok = await onSubmit(input, supplier)

      if (ok) onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-3" onSubmit={submit}>
          <Field>
            <FieldLabel htmlFor="supplier-name">Nombre</FieldLabel>
            <Input
              id="supplier-name"
              value={name}
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
              placeholder="Walmart Supercenter"
              required
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="supplier-rfc">RFC (opcional)</FieldLabel>
              <Input
                id="supplier-rfc"
                value={rfc}
                maxLength={20}
                onChange={(event) => setRfc(event.target.value)}
                placeholder="XAXX010101000"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="supplier-tax">
                IVA por defecto (%)
              </FieldLabel>
              <Input
                id="supplier-tax"
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="0.01"
                value={taxPercent}
                onChange={(event) => setTaxPercent(event.target.value)}
                placeholder="16"
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="supplier-aliases">
              Alias separados por coma
            </FieldLabel>
            <Input
              id="supplier-aliases"
              value={aliases}
              onChange={(event) => setAliases(event.target.value)}
              placeholder="Walmart, Walmex, Bodega Aurrerá"
            />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2Icon data-icon="inline-start" className="animate-spin" />
              ) : null}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SupplierProductsDialog({
  supplier,
  ingredients,
  onClose,
}: {
  supplier: Supplier | null
  ingredients: Ingredient[]
  onClose: () => void
}) {
  const [products, setProducts] = useState<SupplierProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [rawName, setRawName] = useState("")
  const [ingredientId, setIngredientId] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [unit, setUnit] = useState<UnitCode>("UNIT")
  const [lastCost, setLastCost] = useState("")
  const [deleting, setDeleting] = useState<SupplierProduct | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!supplier) {
      setProducts([])
      return
    }

    let cancelled = false
    setLoading(true)

    void getSupplierProducts(supplier.id).then((result) => {
      if (cancelled) return

      setLoading(false)

      if (!result.ok || !result.data) {
        toast.error(result.message ?? "No pudimos cargar los productos")
        return
      }

      setProducts(result.data)
    })

    return () => {
      cancelled = true
    }
  }, [supplier])

  function reload() {
    if (!supplier) return

    void getSupplierProducts(supplier.id).then((result) => {
      if (result.ok && result.data) setProducts(result.data)
    })
  }

  function addProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!supplier) return

    if (rawName.trim().length === 0) {
      toast.error("Escribe el nombre como aparece en el ticket")
      return
    }

    if (!ingredientId) {
      toast.error("Elige el insumo al que corresponde")
      return
    }

    const amount = Number(quantity)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("La cantidad debe ser mayor que cero")
      return
    }

    startTransition(async () => {
      const result = await createSupplierProduct(supplier.id, {
        rawName: rawName.trim(),
        ingredientId,
        quantity: amount,
        unit,
        lastUnitCostGross:
          lastCost.trim() === "" ? undefined : Number(lastCost),
      })

      if (!result.ok) {
        toast.error(result.message ?? "No pudimos guardar el mapeo")
        return
      }

      toast.success("Mapeo guardado")
      setRawName("")
      setLastCost("")
      reload()
    })
  }

  function removeProduct(product: SupplierProduct) {
    if (!supplier) return

    startTransition(async () => {
      const result = await deleteSupplierProduct(supplier.id, product.id)

      if (!result.ok) {
        toast.error(result.message ?? "No pudimos borrar el mapeo")
        return
      }

      toast.success("Mapeo eliminado")
      setDeleting(null)
      reload()
    })
  }

  return (
    <Dialog open={supplier !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Productos de {supplier?.name}</DialogTitle>
          <DialogDescription>
            Cada mapeo enseña cuánto insumo aporta una presentación del
            proveedor (por ejemplo, 1 caja = 12 L). La próxima vez el ticket se
            mapea solo.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-72 overflow-y-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Producto del ticket</th>
                <th className="px-3 py-2 font-medium">Insumo</th>
                <th className="px-3 py-2 text-right font-medium">Presentación</th>
                <th className="px-3 py-2 text-right font-medium">Último costo</th>
                <th className="px-3 py-2 text-right font-medium">Veces</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{product.rawName}</td>
                  <td className="px-3 py-2">
                    {product.ingredient?.name ?? "Sin mapear"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {Number(product.quantity)} {unitLabel(product.unit)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {product.lastUnitCostGross === null
                      ? "—"
                      : `$${Number(product.lastUnitCostGross).toFixed(2)}`}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {product.timesSeen}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleting(product)}
                      aria-label="Eliminar mapeo"
                    >
                      <Trash2Icon />
                    </Button>
                  </td>
                </tr>
              ))}
              {!loading && products.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-sm text-muted-foreground"
                  >
                    Aún no hay mapeos para este proveedor.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          {loading ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              Cargando mapeos…
            </p>
          ) : null}
        </div>

        <form
          className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-3"
          onSubmit={addProduct}
        >
          <p className="text-sm font-medium">Agregar mapeo</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="product-name">
                Como aparece en el ticket
              </FieldLabel>
              <Input
                id="product-name"
                value={rawName}
                maxLength={200}
                onChange={(event) => setRawName(event.target.value)}
                placeholder="SALSA VERDE 1 L"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="product-ingredient">Insumo</FieldLabel>
              <select
                id="product-ingredient"
                value={ingredientId}
                onChange={(event) => setIngredientId(event.target.value)}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <option value="">Elige un insumo</option>
                {ingredients.map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="product-quantity">
                Cuánto aporta
              </FieldLabel>
              <Input
                id="product-quantity"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.0001"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="product-unit">Unidad</FieldLabel>
              <select
                id="product-unit"
                value={unit}
                onChange={(event) => setUnit(event.target.value as UnitCode)}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {UNIT_CODES.map((code) => (
                  <option key={code} value={code}>
                    {unitLabel(code)}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="product-cost">
                Último costo con IVA
              </FieldLabel>
              <Input
                id="product-cost"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={lastCost}
                onChange={(event) => setLastCost(event.target.value)}
                placeholder="Opcional"
              />
            </Field>
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? (
                <Loader2Icon data-icon="inline-start" className="animate-spin" />
              ) : (
                <PlusIcon data-icon="inline-start" />
              )}
              Guardar mapeo
            </Button>
          </div>
        </form>

        <AlertDialog
          open={deleting !== null}
          onOpenChange={(open) => {
            if (!open) setDeleting(null)
          }}
        >
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20">
                <Trash2Icon />
              </AlertDialogMedia>
              <AlertDialogTitle>¿Eliminar este mapeo?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleting?.rawName} dejará de asociarse automáticamente con{" "}
                {deleting?.ingredient?.name ?? "su insumo"} en los tickets
                nuevos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={pending}
                onClick={() => {
                  if (deleting) removeProduct(deleting)
                }}
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
