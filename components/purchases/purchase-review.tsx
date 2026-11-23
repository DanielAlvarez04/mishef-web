"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CheckIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  approvePurchase,
  extractTicket,
  rejectPurchase,
  reviewPurchase,
  type PurchaseItemInput,
  type ReviewInput,
} from "@/app/(app)/purchases/actions"
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
  UNIT_CODES,
  unitLabel,
  type Ingredient,
  type UnitCode,
} from "@/lib/catalog"
import { sameNumber, sameText } from "@/lib/diff"
import {
  duplicatePurchaseId,
  purchaseStatusLabel,
  purchaseStatusVariant,
  type PurchaseDetail,
  type PurchaseItem,
  type Supplier,
} from "@/lib/purchases"

interface DraftItem {
  key: string
  rawDescription: string
  ingredientId: string
  quantity: string
  unit: UnitCode
  lineTotalGross: string
  confidence?: number
  mappingSource?: string
}

const money = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const precise = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 6,
})

function toDraft(items: PurchaseItem[]): DraftItem[] {
  return items.map((item) => ({
    key: item.id,
    rawDescription: item.rawDescription,
    ingredientId: item.ingredientId ?? "",
    quantity: item.quantity,
    unit: item.unit,
    lineTotalGross: item.lineTotalGross,
    confidence:
      item.confidence === null ? undefined : Number(item.confidence),
    mappingSource: item.mappingSource ?? undefined,
  }))
}

function unitCostOf(item: DraftItem): number {
  const quantity = Number(item.quantity)
  const total = Number(item.lineTotalGross)

  if (!Number.isFinite(quantity) || quantity <= 0) return 0
  if (!Number.isFinite(total) || total < 0) return 0

  return total / quantity
}

function normalizeItems(items: DraftItem[]): string {
  return JSON.stringify(
    items.map((item) => ({
      rawDescription: item.rawDescription.trim(),
      ingredientId: item.ingredientId,
      quantity: Number(item.quantity) || 0,
      unit: item.unit,
      lineTotalGross: Number(item.lineTotalGross) || 0,
    }))
  )
}

export function PurchaseReview({
  purchase,
  suppliers,
  ingredients,
  canManage,
}: {
  purchase: PurchaseDetail
  suppliers: Supplier[]
  ingredients: Ingredient[]
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [supplierId, setSupplierId] = useState(purchase.supplierId ?? "")
  const [folio, setFolio] = useState(purchase.folio ?? "")
  const [purchasedAt, setPurchasedAt] = useState(
    purchase.purchasedAt.slice(0, 10)
  )
  const [total, setTotal] = useState(purchase.total)
  const [notes, setNotes] = useState(purchase.notes ?? "")
  const [items, setItems] = useState<DraftItem[]>(() =>
    toDraft(purchase.items)
  )

  const [confirmApprove, setConfirmApprove] = useState(false)
  const [confirmReject, setConfirmReject] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const closed =
    purchase.status === "APPROVED" || purchase.status === "REJECTED"
  const editable = canManage && !closed
  const duplicateId = duplicatePurchaseId(purchase)
  const extractedJson = purchase.extractedJson
  const extractedMeta =
    extractedJson && typeof extractedJson === "object" && !Array.isArray(extractedJson)
      ? (extractedJson as Record<string, unknown>)
      : null
  const detectedSupplier =
    typeof extractedMeta?.supplierName === "string"
      ? extractedMeta.supplierName.trim()
      : ""
  const dateDetected =
    typeof extractedMeta?.purchasedAt === "string" &&
    extractedMeta.purchasedAt.trim().length > 0

  const linesTotal = items.reduce(
    (sum, item) => sum + (Number(item.lineTotalGross) || 0),
    0
  )
  const ticketTotal = Number(total) || 0
  const difference = linesTotal - ticketTotal
  const mismatch = Math.abs(difference) > 0.5
  const unmapped = items.filter(
    (item) => Number(item.lineTotalGross) > 0 && !item.ingredientId
  ).length

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item))
    )
  }

  function addLine() {
    setItems((current) => [
      ...current,
      {
        key: `new-${Date.now()}-${current.length}`,
        rawDescription: "",
        ingredientId: "",
        quantity: "1",
        unit: "UNIT",
        lineTotalGross: "0",
        mappingSource: "MANUAL",
      },
    ])
  }

  function removeLine(key: string) {
    setItems((current) => current.filter((item) => item.key !== key))
  }

  function buildPatch(): ReviewInput | null {
    const patch: ReviewInput = {}

    if (supplierId !== (purchase.supplierId ?? "")) {
      patch.supplierId = supplierId || null
    }

    if (!sameText(folio, purchase.folio)) {
      patch.folio = folio.trim() || null
    }

    if (purchasedAt !== purchase.purchasedAt.slice(0, 10)) {
      patch.purchasedAt = `${purchasedAt}T12:00:00.000Z`
    }

    if (!sameNumber(total, purchase.total)) {
      patch.total = ticketTotal
    }

    if (!sameText(notes, purchase.notes)) {
      patch.notes = notes.trim() || null
    }

    if (normalizeItems(items) !== normalizeItems(toDraft(purchase.items))) {
      patch.items = items
        .filter((item) => item.rawDescription.trim().length > 0)
        .map<PurchaseItemInput>((item) => ({
          rawDescription: item.rawDescription.trim(),
          ingredientId: item.ingredientId || null,
          quantity: Number(item.quantity) || 0,
          unit: item.unit,
          unitCostGross: Number(unitCostOf(item).toFixed(6)),
          lineTotalGross: Number(item.lineTotalGross) || 0,
          confidence: item.confidence,
          mappingSource: item.mappingSource ?? "MANUAL",
        }))
    }

    return Object.keys(patch).length > 0 ? patch : null
  }

  function save() {
    const patch = buildPatch()

    if (!patch) {
      toast.info("Sin cambios")
      return
    }

    startTransition(async () => {
      const result = await reviewPurchase(purchase.id, patch)

      if (!result.ok) {
        toast.error(result.message ?? "No pudimos guardar la revisión")
        return
      }

      toast.success("Revisión guardada")
      router.refresh()
    })
  }

  function reExtract() {
    startTransition(async () => {
      const result = await extractTicket(purchase.id)

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo leer el ticket")
        return
      }

      toast.success("Ticket leído de nuevo")
      router.refresh()
    })
  }

  function approve() {
    if (mismatch) {
      toast.error(
        `La suma de las líneas ($${money.format(linesTotal)}) no coincide con el total del ticket ($${money.format(ticketTotal)}).`
      )
      return
    }

    if (unmapped > 0) {
      toast.error(
        unmapped === 1
          ? "Falta mapear el ingrediente de una línea"
          : `Faltan ${unmapped} líneas por mapear a un ingrediente`
      )
      return
    }

    startTransition(async () => {
      const result = await approvePurchase(purchase.id)

      if (!result.ok) {
        toast.error(result.message ?? "No pudimos aprobar el ticket")
        return
      }

      toast.success("Compra aprobada: el inventario ya tiene las entradas")
      setConfirmApprove(false)
      router.refresh()
    })
  }

  function reject() {
    startTransition(async () => {
      const result = await rejectPurchase(
        purchase.id,
        rejectReason.trim() || undefined
      )

      if (!result.ok) {
        toast.error(result.message ?? "No pudimos rechazar el ticket")
        return
      }

      toast.success("Ticket rechazado")
      setConfirmReject(false)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">
              Ticket de compra
            </h1>
            <Badge variant={purchaseStatusVariant(purchase.status)}>
              {purchaseStatusLabel(purchase.status)}
            </Badge>
            {purchase.confidence !== null ? (
              <span className="text-xs text-muted-foreground">
                Confianza IA {Math.round(Number(purchase.confidence) * 100)}%
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {purchase.branch?.name ?? "Toda la organización"} · Registrado el{" "}
            {new Date(purchase.createdAt).toLocaleDateString("es-MX", {
              timeZone: "America/Mexico_City",
            })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {purchase.documentUrl ? (
            <Button
              variant="outline"
              size="sm"
              render={
                <a
                  href={purchase.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              Ver foto original
            </Button>
          ) : null}
          {editable ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={reExtract}
            >
              <RefreshCwIcon data-icon="inline-start" />
              Volver a leer con IA
            </Button>
          ) : null}
        </div>
      </div>

      {duplicateId ? (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-destructive">
              Este ticket parece duplicado
            </p>
            <p className="text-muted-foreground">
              Ya existe otra compra con el mismo proveedor y folio.{" "}
              <Link
                href={`/purchases/${duplicateId}`}
                className="underline underline-offset-4"
              >
                Ver la otra compra
              </Link>
              . Corrige el folio o rechaza este ticket.
            </p>
          </div>
        </div>
      ) : null}

      {purchase.status === "FAILED" ? (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-destructive">
              La IA no pudo leer el ticket
            </p>
            <p className="text-muted-foreground">
              Captura el proveedor, la fecha, el total y las líneas a mano, o
              vuelve a intentar la extracción con una foto más clara.
            </p>
          </div>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Datos del ticket</CardTitle>
          <CardDescription>
            Estos datos se guardan tal como aparecen en el ticket.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field>
            <FieldLabel htmlFor="purchase-supplier">Proveedor</FieldLabel>
            <select
              id="purchase-supplier"
              value={supplierId}
              disabled={!editable}
              onChange={(event) => setSupplierId(event.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60"
            >
              <option value="">Sin proveedor</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            {detectedSupplier && !supplierId ? (
              <p className="text-xs text-muted-foreground">
                La IA detectó{" "}
                <span className="font-medium text-foreground">
                  {detectedSupplier}
                </span>
                .{" "}
                <Link
                  href="/suppliers"
                  className="underline underline-offset-4"
                >
                  Crear o mapear proveedor
                </Link>
              </p>
            ) : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="purchase-folio">Folio</FieldLabel>
            <Input
              id="purchase-folio"
              value={folio}
              disabled={!editable}
              maxLength={80}
              onChange={(event) => setFolio(event.target.value)}
              placeholder="Folio del ticket"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="purchase-date">Fecha</FieldLabel>
            <Input
              id="purchase-date"
              type="date"
              value={purchasedAt}
              disabled={!editable}
              onChange={(event) => setPurchasedAt(event.target.value)}
            />
            {!dateDetected ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                La IA no detectó una fecha impresa; se usó la fecha de captura.
              </p>
            ) : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="purchase-total">Total con IVA</FieldLabel>
            <Input
              id="purchase-total"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={total}
              disabled={!editable}
              onChange={(event) => setTotal(event.target.value)}
            />
          </Field>

          <Field className="sm:col-span-2 xl:col-span-4">
            <FieldLabel htmlFor="purchase-notes">Notas</FieldLabel>
            <Textarea
              id="purchase-notes"
              value={notes}
              disabled={!editable}
              maxLength={500}
              rows={2}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Observaciones de la revisión"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Líneas del ticket</CardTitle>
            <CardDescription>
              Mapea cada línea a un insumo. El costo unitario se calcula con el
              total de la línea y la cantidad capturada.
            </CardDescription>
          </div>
          {editable ? (
            <Button variant="outline" size="sm" onClick={addLine}>
              <PlusIcon data-icon="inline-start" />
              Agregar línea
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Descripción</th>
                  <th className="px-3 py-2 font-medium">Ingrediente</th>
                  <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                  <th className="px-3 py-2 font-medium">Unidad</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Costo unitario
                  </th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  {editable ? <th className="w-10 px-3 py-2" /> : null}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.key} className="border-t align-top">
                    <td className="px-3 py-2">
                      {editable ? (
                        <Input
                          value={item.rawDescription}
                          maxLength={300}
                          onChange={(event) =>
                            updateItem(item.key, {
                              rawDescription: event.target.value,
                            })
                          }
                          placeholder="Como aparece en el ticket"
                          className="min-w-48"
                        />
                      ) : (
                        <span className="font-medium">
                          {item.rawDescription}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editable ? (
                        <select
                          value={item.ingredientId}
                          onChange={(event) =>
                            updateItem(item.key, {
                              ingredientId: event.target.value,
                            })
                          }
                          className="h-9 min-w-48 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          <option value="">Sin mapear</option>
                          {ingredients.map((ingredient) => (
                            <option key={ingredient.id} value={ingredient.id}>
                              {ingredient.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>
                          {ingredients.find(
                            (ingredient) => ingredient.id === item.ingredientId
                          )?.name ?? "Sin mapear"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {editable ? (
                        <Input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.0001"
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(item.key, {
                              quantity: event.target.value,
                            })
                          }
                          className="w-24 text-right tabular-nums"
                        />
                      ) : (
                        <span className="tabular-nums">
                          {precise.format(Number(item.quantity))}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editable ? (
                        <select
                          value={item.unit}
                          onChange={(event) =>
                            updateItem(item.key, {
                              unit: event.target.value as UnitCode,
                            })
                          }
                          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          {UNIT_CODES.map((unit) => (
                            <option key={unit} value={unit}>
                              {unitLabel(unit)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>{unitLabel(item.unit)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      ${precise.format(unitCostOf(item))}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {editable ? (
                        <Input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={item.lineTotalGross}
                          onChange={(event) =>
                            updateItem(item.key, {
                              lineTotalGross: event.target.value,
                            })
                          }
                          className="w-28 text-right tabular-nums"
                        />
                      ) : (
                        <span className="tabular-nums">
                          ${money.format(Number(item.lineTotalGross))}
                        </span>
                      )}
                    </td>
                    {editable ? (
                      <td className="px-3 py-2">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeLine(item.key)}
                          aria-label="Quitar línea"
                        >
                          <Trash2Icon />
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={editable ? 7 : 6}
                      className="px-3 py-8 text-center text-sm text-muted-foreground"
                    >
                      {purchase.status === "PROCESSING"
                        ? "El ticket aún se está leyendo. Vuelve a intentar la extracción."
                        : "Sin líneas. Agrega las que aparecen en el ticket."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-4 text-sm">
            <span className="text-muted-foreground">
              Suma de líneas:{" "}
              <span className="font-medium text-foreground tabular-nums">
                ${money.format(linesTotal)}
              </span>
            </span>
            <span className="text-muted-foreground">
              Total del ticket:{" "}
              <span className="font-medium text-foreground tabular-nums">
                ${money.format(ticketTotal)}
              </span>
            </span>
            <span
              className={
                mismatch
                  ? "font-medium text-destructive tabular-nums"
                  : "font-medium text-emerald-600 tabular-nums dark:text-emerald-400"
              }
            >
              {mismatch
                ? `Diferencia ${difference > 0 ? "+" : ""}$${money.format(difference)}`
                : "Cuadra"}
            </span>
          </div>
        </CardContent>
      </Card>

      {editable ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setConfirmReject(true)}
            disabled={pending}
          >
            <XIcon data-icon="inline-start" />
            Rechazar
          </Button>
          <Button variant="secondary" onClick={save} disabled={pending}>
            {pending ? (
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
            ) : null}
            Guardar cambios
          </Button>
          <Button
            onClick={() => setConfirmApprove(true)}
            disabled={pending || items.length === 0}
          >
            <CheckIcon data-icon="inline-start" />
            Aprobar y entrar al inventario
          </Button>
        </div>
      ) : null}

      <AlertDialog open={confirmApprove} onOpenChange={setConfirmApprove}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-400">
              <CheckIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>¿Aprobar esta compra?</AlertDialogTitle>
            <AlertDialogDescription>
              Se crearán {items.length} movimiento(s) de inventario por $
              {money.format(linesTotal)} y el costo de cada insumo se
              actualizará al de este ticket. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={approve} disabled={pending}>
              Aprobar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmReject} onOpenChange={setConfirmReject}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20">
              <XIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>¿Rechazar este ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              No se tocará el inventario. Puedes dejar un motivo para el
              registro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Motivo (opcional)"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={reject}
              disabled={pending}
            >
              Rechazar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
