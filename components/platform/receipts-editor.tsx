"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2Icon,
  PlusIcon,
  PrinterIcon,
  RotateCcwIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import {
  applyGlobalReceiptTemplate,
  previewReceiptTemplate,
  saveGlobalReceiptTemplate,
  saveReceiptTemplate,
  testPrintReceipt,
} from "@/app/(app)/platform/receipts/actions"
import {
  previewOrganizationReceiptTemplate,
  saveOrganizationReceiptTemplate,
  testPrintOrganizationReceipt,
} from "@/app/(app)/settings/receipts-actions"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type {
  PlatformReceiptsData,
  ReceiptAlign,
  ReceiptBlock,
  ReceiptPreviewResult,
  ReceiptSize,
  ReceiptTemplate,
} from "@/lib/receipts"

const BLOCK_LABELS: Record<ReceiptBlock["type"], string> = {
  business: "Negocio",
  ticket: "Ticket y fecha",
  order: "Mesa y cliente",
  items: "Productos",
  totals: "Totales",
  payments: "Pagos",
  tipSuggestions: "Propina sugerida",
  text: "Texto libre",
  divider: "Separador",
}

const ALIGN_ITEMS = [
  { value: "left", label: "Izquierda" },
  { value: "center", label: "Centrada" },
]

const SIZE_ITEMS = [
  { value: "small", label: "Pequeña" },
  { value: "normal", label: "Normal" },
  { value: "large", label: "Grande" },
]

const ADD_ITEMS = (
  Object.keys(BLOCK_LABELS) as Array<ReceiptBlock["type"]>
).map((value) => ({ value, label: BLOCK_LABELS[value] }))

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function newBlockId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function newBlock(type: ReceiptBlock["type"]): ReceiptBlock {
  const id = newBlockId()

  switch (type) {
    case "business":
      return {
        id,
        type,
        showName: true,
        showBranch: true,
        showRfc: true,
        showAddress: true,
        align: "center",
      }
    case "ticket":
      return { id, type, showTicket: true, showDate: true, align: "center" }
    case "order":
      return {
        id,
        type,
        fields: ["place", "partySize", "customer"],
        align: "left",
      }
    case "items":
      return {
        id,
        type,
        showVariant: true,
        showQuantity: true,
        showLineTotal: true,
      }
    case "totals":
      return {
        id,
        type,
        fields: ["subtotal", "tax", "discount", "delivery", "tip", "total"],
      }
    case "payments":
      return { id, type, showMethod: true, showAmount: true }
    case "tipSuggestions":
      return { id, type }
    case "text":
      return {
        id,
        type,
        text: "Texto del ticket",
        align: "left",
        size: "normal",
        bold: false,
      }
    case "divider":
      return { id, type }
  }
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

function AlignField({
  value,
  onChange,
}: {
  value: ReceiptAlign
  onChange: (value: ReceiptAlign) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">Alineación</span>
      <Select
        value={value}
        onValueChange={(next) => next && onChange(next as ReceiptAlign)}
        items={ALIGN_ITEMS}
      >
        <SelectTrigger size="sm" aria-label="Alineación">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ALIGN_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function SizeField({
  value,
  onChange,
}: {
  value: ReceiptSize
  onChange: (value: ReceiptSize) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">Tamaño</span>
      <Select
        value={value}
        onValueChange={(next) => next && onChange(next as ReceiptSize)}
        items={SIZE_ITEMS}
      >
        <SelectTrigger size="sm" aria-label="Tamaño">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SIZE_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function toggleField<T extends string>(
  values: T[],
  value: T,
  enabled: boolean
): T[] {
  if (enabled) return values.includes(value) ? values : [...values, value]

  return values.filter((entry) => entry !== value)
}

function BlockEditor({
  block,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
  canMoveUp,
  canMoveDown,
}: {
  block: ReceiptBlock
  onChange: (block: ReceiptBlock) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{BLOCK_LABELS[block.type]}</span>
          <Badge variant="outline">{block.type}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label="Subir bloque"
          >
            <ChevronUpIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label="Bajar bloque"
          >
            <ChevronDownIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            aria-label="Quitar bloque"
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>

      {block.type === "business" ? (
        <div className="grid gap-2">
          <ToggleRow
            label="Nombre del negocio"
            checked={block.showName}
            onChange={(checked) => onChange({ ...block, showName: checked })}
          />
          <ToggleRow
            label="Nombre de la sucursal"
            checked={block.showBranch}
            onChange={(checked) => onChange({ ...block, showBranch: checked })}
          />
          <ToggleRow
            label="RFC del negocio"
            checked={block.showRfc}
            onChange={(checked) => onChange({ ...block, showRfc: checked })}
          />
          <ToggleRow
            label="Dirección"
            checked={block.showAddress}
            onChange={(checked) => onChange({ ...block, showAddress: checked })}
          />
          <AlignField
            value={block.align}
            onChange={(align) => onChange({ ...block, align })}
          />
        </div>
      ) : null}

      {block.type === "ticket" ? (
        <div className="grid gap-2">
          <ToggleRow
            label="Número de ticket"
            checked={block.showTicket}
            onChange={(checked) => onChange({ ...block, showTicket: checked })}
          />
          <ToggleRow
            label="Fecha y hora"
            checked={block.showDate}
            onChange={(checked) => onChange({ ...block, showDate: checked })}
          />
          <AlignField
            value={block.align}
            onChange={(align) => onChange({ ...block, align })}
          />
        </div>
      ) : null}

      {block.type === "order" ? (
        <div className="grid gap-2">
          <ToggleRow
            label="Mesa / mostrador / domicilio"
            checked={block.fields.includes("place")}
            onChange={(checked) =>
              onChange({
                ...block,
                fields: toggleField(block.fields, "place", checked),
              })
            }
          />
          <ToggleRow
            label="Número de personas"
            checked={block.fields.includes("partySize")}
            onChange={(checked) =>
              onChange({
                ...block,
                fields: toggleField(block.fields, "partySize", checked),
              })
            }
          />
          <ToggleRow
            label="Cliente"
            checked={block.fields.includes("customer")}
            onChange={(checked) =>
              onChange({
                ...block,
                fields: toggleField(block.fields, "customer", checked),
              })
            }
          />
          <AlignField
            value={block.align}
            onChange={(align) => onChange({ ...block, align })}
          />
        </div>
      ) : null}

      {block.type === "items" ? (
        <div className="grid gap-2">
          <ToggleRow
            label="Variante"
            checked={block.showVariant}
            onChange={(checked) =>
              onChange({ ...block, showVariant: checked })
            }
          />
          <ToggleRow
            label="Cantidad"
            checked={block.showQuantity}
            onChange={(checked) =>
              onChange({ ...block, showQuantity: checked })
            }
          />
          <ToggleRow
            label="Importe por línea"
            checked={block.showLineTotal}
            onChange={(checked) =>
              onChange({ ...block, showLineTotal: checked })
            }
          />
        </div>
      ) : null}

      {block.type === "totals" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["subtotal", "Subtotal"],
              ["tax", "IVA"],
              ["discount", "Descuento"],
              ["delivery", "Envío"],
              ["tip", "Propina"],
              ["total", "Total"],
            ] as const
          ).map(([field, label]) => (
            <ToggleRow
              key={field}
              label={label}
              checked={block.fields.includes(field)}
              onChange={(checked) =>
                onChange({
                  ...block,
                  fields: toggleField(block.fields, field, checked),
                })
              }
            />
          ))}
        </div>
      ) : null}

      {block.type === "payments" ? (
        <div className="grid gap-2">
          <ToggleRow
            label="Método de pago"
            checked={block.showMethod}
            onChange={(checked) =>
              onChange({ ...block, showMethod: checked })
            }
          />
          <ToggleRow
            label="Importe"
            checked={block.showAmount}
            onChange={(checked) =>
              onChange({ ...block, showAmount: checked })
            }
          />
        </div>
      ) : null}

      {block.type === "tipSuggestions" ? (
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Sugerencias de 10 %, 15 % y 20 % sobre el total. Solo se imprimen
          cuando el pago es en efectivo o transferencia y aún no hay propina
          registrada.
        </p>
      ) : null}

      {block.type === "text" ? (
        <div className="grid gap-2">
          <Textarea
            value={block.text}
            maxLength={500}
            rows={3}
            onChange={(event) =>
              onChange({ ...block, text: event.target.value })
            }
            placeholder="Ej. ¡Gracias por su visita!"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <AlignField
              value={block.align}
              onChange={(align) => onChange({ ...block, align })}
            />
            <SizeField
              value={block.size}
              onChange={(size) => onChange({ ...block, size })}
            />
          </div>
          <ToggleRow
            label="Negrita"
            checked={block.bold}
            onChange={(checked) => onChange({ ...block, bold: checked })}
          />
        </div>
      ) : null}

      {block.type === "divider" ? (
        <p className="text-xs text-muted-foreground">
          Imprime una línea separadora de 32 columnas.
        </p>
      ) : null}
    </div>
  )
}

export function ReceiptsEditor({
  data,
  canManageGlobal,
}: {
  data: PlatformReceiptsData
  canManageGlobal: boolean
}) {
  const router = useRouter()
  const organizations = data.organizations.filter(
    (item) => item.branches.length > 0
  )
  const firstOrganization = organizations[0] ?? null
  const [organizationId, setOrganizationId] = React.useState(
    firstOrganization?.id ?? ""
  )
  const organization =
    organizations.find((item) => item.id === organizationId) ?? null
  const [branchId, setBranchId] = React.useState(
    firstOrganization?.branches[0]?.id ?? ""
  )
  const branch =
    organization?.branches.find((item) => item.id === branchId) ?? null
  const [scope, setScope] = React.useState<"global" | "branch">(
    canManageGlobal ? "global" : "branch"
  )
  const [template, setTemplate] = React.useState<ReceiptTemplate>(() =>
    clone(
      canManageGlobal
        ? data.globalTemplate
        : branch?.receiptTemplate ?? data.globalTemplate
    )
  )
  const [preview, setPreview] = React.useState<ReceiptPreviewResult | null>(null)
  const [previewError, setPreviewError] = React.useState<string | null>(null)
  const [previewing, setPreviewing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [testing, setTesting] = React.useState(false)
  const [confirmApply, setConfirmApply] = React.useState(false)
  const [addType, setAddType] =
    React.useState<ReceiptBlock["type"]>("text")
  const overrideCount = organizations.reduce(
    (total, item) =>
      total + item.branches.filter((branch) => branch.receiptTemplate).length,
    0
  )

  React.useEffect(() => {
    if (!branchId) return

    let cancelled = false

    const timer = setTimeout(() => {
      if (cancelled) return

      setPreviewing(true)

      const request = canManageGlobal
        ? previewReceiptTemplate(branchId, template)
        : previewOrganizationReceiptTemplate(branchId, template)

      request
        .then((result) => {
          if (cancelled) return

          if (!result.ok || !result.data) {
            setPreviewError(
              result.message ?? "No se pudo generar la vista previa."
            )
            setPreview(null)
          } else {
            setPreview(result.data)
            setPreviewError(null)
          }
        })
        .finally(() => {
          if (!cancelled) setPreviewing(false)
        })
    }, 450)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [branchId, template, canManageGlobal])

  function chooseOrganization(id: string | null) {
    const next = organizations.find((item) => item.id === id)

    if (!next) return

    const nextBranch = next.branches[0] ?? null

    setOrganizationId(next.id)
    setBranchId(nextBranch?.id ?? "")

    if (scope === "branch") {
      setTemplate(clone(nextBranch?.receiptTemplate ?? data.globalTemplate))
    }

    setPreview(null)
    setPreviewError(null)
  }

  function chooseBranch(id: string | null) {
    const next = organization?.branches.find((item) => item.id === id)

    if (!next) return

    setBranchId(next.id)

    if (scope === "branch") {
      setTemplate(clone(next.receiptTemplate ?? data.globalTemplate))
    }

    setPreview(null)
    setPreviewError(null)
  }

  function switchScope(next: "global" | "branch") {
    if (next === "global" && !canManageGlobal) return

    setScope(next)
    setTemplate(
      clone(
        next === "global"
          ? data.globalTemplate
          : branch?.receiptTemplate ?? data.globalTemplate
      )
    )
    setPreview(null)
    setPreviewError(null)
  }

  function updateBlock(id: string, next: ReceiptBlock) {
    setTemplate((current) => ({
      ...current,
      blocks: current.blocks.map((block) => (block.id === id ? next : block)),
    }))
  }

  function moveBlock(index: number, delta: number) {
    setTemplate((current) => {
      const target = index + delta

      if (target < 0 || target >= current.blocks.length) return current

      const blocks = [...current.blocks]
      const [block] = blocks.splice(index, 1)
      blocks.splice(target, 0, block)

      return { ...current, blocks }
    })
  }

  function removeBlock(id: string) {
    setTemplate((current) => ({
      ...current,
      blocks: current.blocks.filter((block) => block.id !== id),
    }))
  }

  function addBlock() {
    if (template.blocks.length >= 40) {
      toast.error("La plantilla admite máximo 40 bloques.")
      return
    }

    setTemplate((current) => ({
      ...current,
      blocks: [...current.blocks, newBlock(addType)],
    }))
  }

  async function save(reset = false) {
    if (scope === "branch" && !branchId) return

    if (!reset && template.blocks.length === 0) {
      toast.error("Agrega al menos un bloque al ticket.")
      return
    }

    setSaving(true)

    try {
      const result =
        scope === "global"
          ? await saveGlobalReceiptTemplate(reset ? null : template)
          : canManageGlobal
            ? await saveReceiptTemplate(
                branchId,
                reset ? null : template
              )
            : await saveOrganizationReceiptTemplate(
                branchId,
                reset ? null : template
              )

      if (!result.ok || !result.data) {
        toast.error(result.message ?? "No se pudo guardar la plantilla.")
        return
      }

      setTemplate(clone(result.data.template))
      toast.success(
        reset
          ? scope === "global"
            ? "Plantilla global restablecida"
            : "Sucursal restablecida a la plantilla global"
          : "Plantilla guardada"
      )
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function applyGlobal() {
    setSaving(true)

    try {
      const result = await applyGlobalReceiptTemplate()

      if (!result.ok || !result.data) {
        toast.error(result.message ?? "No se pudo aplicar la plantilla global.")
        return
      }

      toast.success(
        `Plantilla global aplicada a ${result.data.cleared} sucursal(es)`
      )
      setConfirmApply(false)
      switchScope("global")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function testPrint() {
    if (!branchId) return

    if (!branch?.terminals.length) {
      toast.error("La sucursal no tiene una terminal Point en modo PDV.")
      return
    }

    setTesting(true)

    try {
      const result = canManageGlobal
        ? await testPrintReceipt(branchId, template)
        : await testPrintOrganizationReceipt(branchId, template)

      if (!result.ok || !result.data) {
        toast.error(result.message ?? "No se pudo imprimir la prueba.")
        return
      }

      toast.success("Prueba de ticket enviada")
    } finally {
      setTesting(false)
    }
  }

  if (!organization || !branch) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          No hay sucursales activas para editar.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Configuración</CardTitle>
            <CardDescription>
              La plantilla global aplica a todas las sucursales que no tengan
              un override. La información de cada sucursal se toma al imprimir.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {canManageGlobal ? (
              <div className="flex flex-col gap-2 rounded-lg border p-3">
                <span className="text-sm font-medium">Alcance</span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={scope === "global" ? "default" : "outline"}
                    onClick={() => switchScope("global")}
                  >
                    Global (todos los negocios)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={scope === "branch" ? "default" : "outline"}
                    onClick={() => switchScope("branch")}
                  >
                    Sucursal específica
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">
                  {scope === "global"
                    ? "Se guarda como default para todas las sucursales. Usa «Aplicar global» para borrar overrides existentes."
                    : "Se guarda solo para la sucursal seleccionada y tiene prioridad sobre la global."}
                </span>
                {scope === "global" && overrideCount > 0 ? (
                  <span className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
                    {overrideCount} sucursal(es) tienen una plantilla propia.
                    Mientras no apliques la global, seguirán usando su override.
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {canManageGlobal ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    Negocio {scope === "global" ? "(vista previa)" : ""}
                  </span>
                  <Select
                    value={organizationId}
                    onValueChange={chooseOrganization}
                    items={organizations.map((item) => ({
                      value: item.id,
                      label: item.name,
                    }))}
                  >
                    <SelectTrigger aria-label="Negocio">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">
                  Sucursal {scope === "global" ? "(datos de ejemplo)" : ""}
                </span>
                <Select
                  value={branchId}
                  onValueChange={chooseBranch}
                  items={organization.branches.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))}
                >
                  <SelectTrigger aria-label="Sucursal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {organization.branches.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => void save()}
                disabled={saving || testing}
              >
                {saving ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <SaveIcon />
                )}
                {scope === "global" ? "Guardar global" : "Guardar sucursal"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void save(true)}
                disabled={saving || testing}
              >
                <RotateCcwIcon />
                {scope === "global"
                  ? "Restablecer global"
                  : "Volver a la global"}
              </Button>
              {canManageGlobal ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmApply(true)}
                  disabled={saving || testing}
                >
                  Aplicar global a todas
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => void testPrint()}
                disabled={
                  testing || saving || branch.terminals.length === 0
                }
              >
                {testing ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <PrinterIcon />
                )}
                Probar impresión
              </Button>
              <span className="text-xs text-muted-foreground">
                {branch.terminals.length > 0
                  ? `Terminal: ${
                      branch.terminals[0].name ?? "Point Smart"
                    }`
                  : "Sin terminal PDV en esta sucursal"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bloques del ticket</CardTitle>
            <CardDescription>
              Ordena los bloques con las flechas. Puedes quitar y agregar
              secciones.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {template.blocks.map((block, index) => (
              <BlockEditor
                key={block.id}
                block={block}
                onChange={(next) => updateBlock(block.id, next)}
                onMoveUp={() => moveBlock(index, -1)}
                onMoveDown={() => moveBlock(index, 1)}
                onRemove={() => removeBlock(block.id)}
                canMoveUp={index > 0}
                canMoveDown={index < template.blocks.length - 1}
              />
            ))}

            <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed p-3">
              <div className="flex min-w-40 flex-1 flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">
                  Agregar bloque
                </span>
                <Select
                  value={addType}
                  onValueChange={(next) =>
                    next && setAddType(next as ReceiptBlock["type"])
                  }
                  items={ADD_ITEMS}
                >
                  <SelectTrigger size="sm" aria-label="Tipo de bloque">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADD_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" onClick={addBlock}>
                <PlusIcon />
                Agregar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Vista previa
              <Badge variant="outline">58 mm · 32 col</Badge>
            </CardTitle>
            <CardDescription>
              La vista previa usa una orden de ejemplo.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {previewing ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2Icon className="size-3 animate-spin" />
                Generando vista previa…
              </p>
            ) : null}

            {previewError ? (
              <p className="flex items-start gap-2 text-xs text-destructive">
                <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
                {previewError}
              </p>
            ) : null}

            <div className="mx-auto w-fit max-w-full rounded-md bg-white px-3 py-3 text-[11px] leading-snug text-black shadow-sm ring-1 ring-black/10">
              <div
                style={{
                  width: "32ch",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                  whiteSpace: "pre-wrap",
                }}
                dangerouslySetInnerHTML={{ __html: preview?.html ?? "" }}
              />
            </div>

            {preview?.warnings.length ? (
              <div className="flex flex-col gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
                {preview.warnings.map((warning) => (
                  <p key={warning} className="flex items-start gap-1.5">
                    <AlertTriangleIcon className="mt-0.5 size-3 shrink-0" />
                    {warning}
                  </p>
                ))}
              </div>
            ) : null}

            {preview ? (
              <p className="text-[11px] text-muted-foreground">
                {preview.content.length} / 4096 caracteres
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmApply} onOpenChange={setConfirmApply}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <AlertTriangleIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Aplicar plantilla global</AlertDialogTitle>
            <AlertDialogDescription>
              Se quitarán los overrides de todas las sucursales y todas usarán
              la plantilla global. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void applyGlobal()}
              disabled={saving}
            >
              Aplicar a todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
