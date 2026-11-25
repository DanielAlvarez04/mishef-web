"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AlertTriangleIcon } from "lucide-react"
import { toast } from "sonner"

import { saveOrganizationReceiptTemplate } from "@/app/(app)/settings/receipts-actions"
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
import { cn } from "@/lib/utils"
import type {
  OrganizationReceiptsData,
  ReceiptBlock,
  ReceiptTemplate,
} from "@/lib/receipts"

const BLOCK_LABELS: Partial<Record<ReceiptBlock["type"], string>> = {
  business: "Negocio",
  ticket: "Ticket",
  order: "Mesa y cliente",
  items: "Productos",
  totals: "Totales",
  payments: "Pagos",
  tipSuggestions: "Propina sugerida",
  meta: "ID y atención",
  text: "Texto libre",
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function toggleValue<T extends string>(
  values: T[],
  value: T,
  enabled: boolean
): T[] {
  if (enabled) return values.includes(value) ? values : [...values, value]

  return values.filter((entry) => entry !== value)
}

function SwitchRow({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <label
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm",
        disabled && "opacity-60"
      )}
    >
      <span>{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </label>
  )
}

function blockLabel(block: ReceiptBlock): string {
  if (block.type === "text") {
    const text = block.text.trim()
    return text.length > 0
      ? `Texto libre: ${text.slice(0, 36)}${text.length > 36 ? "…" : ""}`
      : "Texto libre"
  }

  return BLOCK_LABELS[block.type] ?? block.type
}

export function ReceiptFieldsCard({
  data,
  activeBranchId,
}: {
  data: OrganizationReceiptsData
  activeBranchId: string | null
}) {
  const router = useRouter()
  const branches = data.organization.branches
  const initialBranch =
    branches.find((branch) => branch.id === activeBranchId) ?? branches[0]
  const [branchId, setBranchId] = React.useState(initialBranch?.id ?? "")
  const [template, setTemplate] = React.useState<ReceiptTemplate>(() =>
    clone(initialBranch?.receiptTemplate ?? data.globalTemplate)
  )
  const [saving, setSaving] = React.useState(false)
  const [confirmReset, setConfirmReset] = React.useState(false)

  const branch = branches.find((entry) => entry.id === branchId) ?? null
  const storedTemplate = branch?.receiptTemplate ?? data.globalTemplate
  const dirty = JSON.stringify(template) !== JSON.stringify(storedTemplate)
  const hasOverride = branch?.receiptTemplate != null

  function chooseBranch(id: string | null) {
    const next = branches.find((entry) => entry.id === id)

    if (!next) return

    setBranchId(next.id)
    setTemplate(clone(next.receiptTemplate ?? data.globalTemplate))
  }

  function patchBlock(id: string, patch: Record<string, unknown>) {
    setTemplate((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id === id
          ? ({ ...block, ...patch } as ReceiptBlock)
          : block
      ),
    }))
  }

  async function save() {
    if (!branchId) return

    if (!dirty) {
      toast.info("Sin cambios")
      return
    }

    setSaving(true)

    try {
      const result = await saveOrganizationReceiptTemplate(branchId, template)

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo guardar el ticket.")
        return
      }

      toast.success("Ticket actualizado")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function reset() {
    if (!branchId) return

    setSaving(true)

    try {
      const result = await saveOrganizationReceiptTemplate(branchId, null)

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo restablecer el ticket.")
        return
      }

      setTemplate(clone(data.globalTemplate))
      setConfirmReset(false)
      toast.success("La sucursal usará la plantilla global")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  function renderBlock(block: ReceiptBlock) {
    if (block.type === "divider") return null

    const off = !block.enabled

    return (
      <div
        key={block.id}
        className="flex flex-col gap-2 rounded-lg border p-3"
      >
        <p className="text-sm font-medium">{blockLabel(block)}</p>
        <SwitchRow
          label="Incluir en el ticket"
          checked={block.enabled}
          onChange={(enabled) => patchBlock(block.id, { enabled })}
        />

        {block.type === "business" ? (
          <>
            <SwitchRow
              label="Nombre del negocio"
              checked={block.showName}
              onChange={(showName) => patchBlock(block.id, { showName })}
              disabled={off}
            />
            <SwitchRow
              label="Nombre de la sucursal"
              checked={block.showBranch}
              onChange={(showBranch) => patchBlock(block.id, { showBranch })}
              disabled={off}
            />
            <SwitchRow
              label="RFC del negocio"
              checked={block.showRfc}
              onChange={(showRfc) => patchBlock(block.id, { showRfc })}
              disabled={off}
            />
            <SwitchRow
              label="Dirección"
              checked={block.showAddress}
              onChange={(showAddress) => patchBlock(block.id, { showAddress })}
              disabled={off}
            />
          </>
        ) : null}

        {block.type === "ticket" ? (
          <>
            <SwitchRow
              label="Número de ticket"
              checked={block.showTicket}
              onChange={(showTicket) => patchBlock(block.id, { showTicket })}
              disabled={off}
            />
            <SwitchRow
              label="Fecha y hora"
              checked={block.showDate}
              onChange={(showDate) => patchBlock(block.id, { showDate })}
              disabled={off}
            />
          </>
        ) : null}

        {block.type === "order" ? (
          <>
            <SwitchRow
              label="Mesa / mostrador / domicilio"
              checked={block.fields.includes("place")}
              onChange={(checked) =>
                patchBlock(block.id, {
                  fields: toggleValue(block.fields, "place", checked),
                })
              }
              disabled={off}
            />
            <SwitchRow
              label="Número de personas"
              checked={block.fields.includes("partySize")}
              onChange={(checked) =>
                patchBlock(block.id, {
                  fields: toggleValue(block.fields, "partySize", checked),
                })
              }
              disabled={off}
            />
            <SwitchRow
              label="Cliente"
              checked={block.fields.includes("customer")}
              onChange={(checked) =>
                patchBlock(block.id, {
                  fields: toggleValue(block.fields, "customer", checked),
                })
              }
              disabled={off}
            />
          </>
        ) : null}

        {block.type === "items" ? (
          <>
            <SwitchRow
              label="Variante / presentación"
              checked={block.showVariant}
              onChange={(showVariant) =>
                patchBlock(block.id, { showVariant })
              }
              disabled={off}
            />
            <SwitchRow
              label="Cantidad"
              checked={block.showQuantity}
              onChange={(showQuantity) =>
                patchBlock(block.id, { showQuantity })
              }
              disabled={off}
            />
            <SwitchRow
              label="Importe por línea"
              checked={block.showLineTotal}
              onChange={(showLineTotal) =>
                patchBlock(block.id, { showLineTotal })
              }
              disabled={off}
            />
          </>
        ) : null}

        {block.type === "totals" ? (
          <>
            {(
              [
                ["subtotal", "Subtotal"],
                ["tax", "IVA"],
                ["discount", "Descuento"],
                ["tip", "Propina"],
                ["delivery", "Envío"],
                ["total", "Total"],
              ] as const
            ).map(([field, label]) => (
              <SwitchRow
                key={field}
                label={label}
                checked={block.fields.includes(field)}
                onChange={(checked) =>
                  patchBlock(block.id, {
                    fields: toggleValue(block.fields, field, checked),
                  })
                }
                disabled={off}
              />
            ))}
          </>
        ) : null}

        {block.type === "payments" ? (
          <>
            <SwitchRow
              label="Título PAGOS"
              checked={block.showTitle}
              onChange={(showTitle) => patchBlock(block.id, { showTitle })}
              disabled={off}
            />
            <SwitchRow
              label="Método de pago"
              checked={block.showMethod}
              onChange={(showMethod) => patchBlock(block.id, { showMethod })}
              disabled={off}
            />
            <SwitchRow
              label="Importe"
              checked={block.showAmount}
              onChange={(showAmount) => patchBlock(block.id, { showAmount })}
              disabled={off}
            />
          </>
        ) : null}

        {block.type === "meta" ? (
          <>
            <SwitchRow
              label="ID Ticket"
              checked={block.showTicketUid}
              onChange={(showTicketUid) =>
                patchBlock(block.id, { showTicketUid })
              }
              disabled={off}
            />
            <SwitchRow
              label="Atendido por"
              checked={block.showServedBy}
              onChange={(showServedBy) =>
                patchBlock(block.id, { showServedBy })
              }
              disabled={off}
            />
          </>
        ) : null}
      </div>
    )
  }

  if (!branch) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ticket de la terminal</CardTitle>
          <CardDescription>
            Necesitas una sucursal activa para configurar el ticket.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Crea una sucursal en Configuración → Negocio y vuelve a esta
            sección.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket de la terminal</CardTitle>
        <CardDescription>
          Elige qué datos se imprimen en la sucursal. El diseño lo define el
          equipo de Mishef; aquí solo activas o desactivas campos.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {branches.length > 1 ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Sucursal</span>
            <Select
              value={branchId}
              onValueChange={chooseBranch}
              items={branches.map((entry) => ({
                value: entry.id,
                label: entry.name,
              }))}
            >
              <SelectTrigger className="w-full sm:w-72" aria-label="Sucursal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {branches.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-2">
          {template.blocks.map(renderBlock)}
        </div>

        <p className="text-xs text-muted-foreground">
          Todos los campos vienen activos. Si desactivas uno, se guarda solo
          para esta sucursal.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void save()} disabled={saving || !dirty}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
          {hasOverride ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmReset(true)}
              disabled={saving}
            >
              Usar plantilla global
            </Button>
          ) : null}
        </div>
      </CardContent>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <AlertTriangleIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>¿Usar la plantilla global?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrarán los cambios de ticket de esta sucursal y volverá a la
              plantilla que definió el superadmin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void reset()}
              disabled={saving}
            >
              Usar plantilla global
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
