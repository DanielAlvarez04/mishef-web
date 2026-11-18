"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon, PencilIcon, PlusIcon, SaveIcon } from "lucide-react"
import { toast } from "sonner"

import {
  createPlatformPlan,
  updatePlatformPlan,
  type PlanInput,
} from "@/app/(app)/plans/actions"
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  formatBytes,
  formatMoney,
  type Plan,
} from "@/lib/billing"
import { sameNumber, sameText } from "@/lib/diff"

interface PlanForm {
  code: string
  name: string
  description: string
  priceMonthly: string
  priceYearly: string
  perBranch: boolean
  trialDays: string
  maxBranches: string
  maxUsersPerBranch: string
  maxImagesPerItem: string
  maxVideosPerItem: string
  maxStorageGb: string
  maxInventoryItems: string
  customDomain: boolean
  isActive: boolean
  isPublic: boolean
}

function formFromPlan(plan: Plan | null): PlanForm {
  return {
    code: plan?.code ?? "",
    name: plan?.name ?? "",
    description: plan?.description ?? "",
    priceMonthly: String(plan?.priceMonthly ?? 0),
    priceYearly: String(plan?.priceYearly ?? 0),
    perBranch: plan?.perBranch ?? false,
    trialDays: String(plan?.trialDays ?? 14),
    maxBranches: plan?.maxBranches ? String(plan.maxBranches) : "",
    maxUsersPerBranch: plan?.maxUsersPerBranch
      ? String(plan.maxUsersPerBranch)
      : "",
    maxImagesPerItem: String(plan?.maxImagesPerItem ?? 1),
    maxVideosPerItem: String(plan?.maxVideosPerItem ?? 0),
    maxStorageGb: plan?.maxStorageBytes
      ? String(Math.round((plan.maxStorageBytes / 1024 ** 3) * 10) / 10)
      : "",
    maxInventoryItems: plan?.maxInventoryItems
      ? String(plan.maxInventoryItems)
      : "",
    customDomain: plan?.customDomain ?? false,
    isActive: plan?.isActive ?? true,
    isPublic: plan?.isPublic ?? true,
  }
}

function numberOrNull(value: string): number | null {
  if (value.trim() === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formToInput(form: PlanForm): PlanInput {
  const storageGb = numberOrNull(form.maxStorageGb)

  return {
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    priceMonthly: Number(form.priceMonthly) || 0,
    priceYearly: Number(form.priceYearly) || 0,
    perBranch: form.perBranch,
    trialDays: Number(form.trialDays) || 0,
    maxBranches: numberOrNull(form.maxBranches),
    maxUsersPerBranch: numberOrNull(form.maxUsersPerBranch),
    maxImagesPerItem: Number(form.maxImagesPerItem) || 1,
    maxVideosPerItem: Number(form.maxVideosPerItem) || 0,
    maxStorageBytes:
      storageGb === null ? null : Math.round(storageGb * 1024 ** 3),
    maxInventoryItems: numberOrNull(form.maxInventoryItems),
    customDomain: form.customDomain,
    isActive: form.isActive,
    isPublic: form.isPublic,
  }
}

function changedFields(original: Plan, next: PlanInput): Partial<PlanInput> {
  const patch: Partial<PlanInput> = {}

  if (!sameText(original.code, next.code)) patch.code = next.code
  if (!sameText(original.name, next.name)) patch.name = next.name
  if (!sameText(original.description, next.description)) {
    patch.description = next.description
  }
  if (!sameNumber(original.priceMonthly, next.priceMonthly)) {
    patch.priceMonthly = next.priceMonthly
  }
  if (!sameNumber(original.priceYearly, next.priceYearly)) {
    patch.priceYearly = next.priceYearly
  }
  if (original.perBranch !== next.perBranch) patch.perBranch = next.perBranch
  if (!sameNumber(original.trialDays, next.trialDays)) {
    patch.trialDays = next.trialDays
  }
  if (!sameNumber(original.maxBranches, next.maxBranches)) {
    patch.maxBranches = next.maxBranches
  }
  if (!sameNumber(original.maxUsersPerBranch, next.maxUsersPerBranch)) {
    patch.maxUsersPerBranch = next.maxUsersPerBranch
  }
  if (!sameNumber(original.maxImagesPerItem, next.maxImagesPerItem)) {
    patch.maxImagesPerItem = next.maxImagesPerItem
  }
  if (!sameNumber(original.maxVideosPerItem, next.maxVideosPerItem)) {
    patch.maxVideosPerItem = next.maxVideosPerItem
  }
  if (!sameNumber(original.maxStorageBytes, next.maxStorageBytes)) {
    patch.maxStorageBytes = next.maxStorageBytes
  }
  if (!sameNumber(original.maxInventoryItems, next.maxInventoryItems)) {
    patch.maxInventoryItems = next.maxInventoryItems
  }
  if (original.customDomain !== next.customDomain) {
    patch.customDomain = next.customDomain
  }
  if (original.isActive !== next.isActive) patch.isActive = next.isActive
  if (original.isPublic !== next.isPublic) patch.isPublic = next.isPublic

  return patch
}

export function PlansTable({ initial }: { initial: Plan[] }) {
  const router = useRouter()
  const [plans, setPlans] = React.useState(initial)
  const [editing, setEditing] = React.useState<Plan | "new" | null>(null)
  const [form, setForm] = React.useState<PlanForm>(formFromPlan(null))
  const [pending, setPending] = React.useState(false)

  const isNew = editing === "new"
  const original = editing && editing !== "new" ? editing : null

  function open(plan: Plan | "new") {
    setEditing(plan)
    setForm(formFromPlan(plan === "new" ? null : plan))
  }

  function set<K extends keyof PlanForm>(key: K, value: PlanForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function save() {
    const input = formToInput(form)

    if (!input.code || !input.name) {
      toast.error("El código y el nombre son obligatorios")
      return
    }

    if (isNew) {
      setPending(true)
      const result = await createPlatformPlan(input)

      if (!result.ok || !result.data) {
        toast.error(result.message ?? "No se pudo crear el plan")
      } else {
        setPlans((current) => [...current, result.data!])
        toast.success("Plan creado")
        setEditing(null)
        router.refresh()
      }
      setPending(false)
      return
    }

    if (!original) return

    const patch = changedFields(original, input)

    if (Object.keys(patch).length === 0) {
      toast.info("Sin cambios")
      return
    }

    setPending(true)
    const result = await updatePlatformPlan(original.id, patch)

    if (!result.ok || !result.data) {
      toast.error(result.message ?? "No se pudo guardar el plan")
    } else {
      setPlans((current) =>
        current.map((plan) => (plan.id === result.data!.id ? result.data! : plan))
      )
      toast.success("Plan actualizado")
      setEditing(null)
      router.refresh()
    }
    setPending(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Planes</CardTitle>
        <CardDescription>
          Precios, límites y disponibilidad. Los cambios aplican a nuevas
          suscripciones; las existentes conservan su precio contratado.
        </CardDescription>
        <Button
          type="button"
          size="sm"
          className="w-fit"
          onClick={() => open("new")}
        >
          <PlusIcon />
          Nuevo plan
        </Button>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Plan</th>
                <th className="px-4 py-2 font-medium">Mensual</th>
                <th className="px-4 py-2 font-medium">Anual</th>
                <th className="px-4 py-2 font-medium">Límites</th>
                <th className="px-4 py-2 font-medium">Dominio</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {plans
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((plan) => (
                  <tr key={plan.id} className="border-t align-top">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{plan.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {plan.code}
                        </span>
                        {plan.description ? (
                          <span className="mt-1 max-w-xs text-xs text-muted-foreground">
                            {plan.description}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatMoney(plan.priceMonthly, plan.currency)}
                      {plan.perBranch ? " / sucursal" : ""}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatMoney(plan.priceYearly, plan.currency)}
                      {plan.perBranch ? " / sucursal" : ""}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div>
                        {plan.maxBranches ?? "∞"} sucursales ·{" "}
                        {plan.maxUsersPerBranch ?? "∞"} usuarios/sucursal
                      </div>
                      <div>
                        {plan.maxStorageBytes
                          ? formatBytes(plan.maxStorageBytes)
                          : "Almacenamiento ∞"}{" "}
                        · {plan.maxImagesPerItem} img
                        {plan.maxVideosPerItem > 0
                          ? ` · ${plan.maxVideosPerItem} video`
                          : ""}
                      </div>
                      <div>
                        {plan.maxInventoryItems ?? "∞"} artículos de inventario
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={plan.customDomain ? "secondary" : "outline"}>
                        {plan.customDomain ? "Personalizado" : "mishef.co"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={plan.isActive ? "default" : "outline"}>
                          {plan.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                        {plan.isPublic ? (
                          <Badge variant="secondary">Público</Badge>
                        ) : (
                          <Badge variant="outline">Oculto</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => open(plan)}
                      >
                        <PencilIcon />
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isNew ? "Nuevo plan" : "Editar plan"}</DialogTitle>
            <DialogDescription>
              {isNew
                ? "Crea un plan comercial."
                : "Solo se envían los campos que cambiaron."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="plan-code">Código</FieldLabel>
              <Input
                id="plan-code"
                value={form.code}
                maxLength={40}
                disabled={!isNew}
                onChange={(event) => set("code", event.target.value)}
              />
              <FieldDescription>No cambia después de crear.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="plan-name">Nombre</FieldLabel>
              <Input
                id="plan-name"
                value={form.name}
                maxLength={80}
                onChange={(event) => set("name", event.target.value)}
              />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="plan-description">Descripción</FieldLabel>
              <Input
                id="plan-description"
                value={form.description}
                maxLength={300}
                onChange={(event) => set("description", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="plan-monthly">Precio mensual</FieldLabel>
              <Input
                id="plan-monthly"
                type="number"
                min="0"
                step="0.01"
                value={form.priceMonthly}
                onChange={(event) => set("priceMonthly", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="plan-yearly">Precio anual</FieldLabel>
              <Input
                id="plan-yearly"
                type="number"
                min="0"
                step="0.01"
                value={form.priceYearly}
                onChange={(event) => set("priceYearly", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="plan-trial">Días de prueba</FieldLabel>
              <Input
                id="plan-trial"
                type="number"
                min="0"
                max="365"
                value={form.trialDays}
                onChange={(event) => set("trialDays", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="plan-storage">Almacenamiento (GB)</FieldLabel>
              <Input
                id="plan-storage"
                type="number"
                min="1"
                step="0.1"
                value={form.maxStorageGb}
                placeholder="Sin límite"
                onChange={(event) => set("maxStorageGb", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="plan-branches">Sucursales</FieldLabel>
              <Input
                id="plan-branches"
                type="number"
                min="1"
                value={form.maxBranches}
                placeholder="Sin límite"
                onChange={(event) => set("maxBranches", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="plan-users">Usuarios por sucursal</FieldLabel>
              <Input
                id="plan-users"
                type="number"
                min="1"
                value={form.maxUsersPerBranch}
                placeholder="Sin límite"
                onChange={(event) => set("maxUsersPerBranch", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="plan-images">Imágenes por artículo</FieldLabel>
              <Input
                id="plan-images"
                type="number"
                min="1"
                value={form.maxImagesPerItem}
                onChange={(event) => set("maxImagesPerItem", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="plan-videos">Videos por artículo</FieldLabel>
              <Input
                id="plan-videos"
                type="number"
                min="0"
                value={form.maxVideosPerItem}
                onChange={(event) => set("maxVideosPerItem", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="plan-inventory">Artículos de inventario</FieldLabel>
              <Input
                id="plan-inventory"
                type="number"
                min="1"
                value={form.maxInventoryItems}
                placeholder="Sin límite"
                onChange={(event) => set("maxInventoryItems", event.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.perBranch}
                onCheckedChange={(checked) => set("perBranch", checked)}
              />
              Precio por sucursal
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.customDomain}
                onCheckedChange={(checked) => set("customDomain", checked)}
              />
              Dominio personalizado
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => set("isActive", checked)}
              />
              Plan activo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.isPublic}
                onCheckedChange={(checked) => set("isPublic", checked)}
              />
              Visible para negocios
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(null)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={() => void save()} disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
