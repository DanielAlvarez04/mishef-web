"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Loader2Icon,
  PencilIcon,
  SaveIcon,
  SearchIcon,
} from "lucide-react"
import { toast } from "sonner"

import { updateOrganizationSubscription } from "@/app/(app)/subscriptions/actions"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  formatBytes,
  SUBSCRIPTION_STATUS_LABELS,
  type BillingInterval,
  type Plan,
  type PlatformOrganization,
  type SubscriptionStatus,
} from "@/lib/billing"

function formatDate(value: string | null): string {
  if (!value) return "—"
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
  }).format(new Date(value))
}

function toInputDate(value: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (part: number) => String(part).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function statusVariant(
  status: SubscriptionStatus | null
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "ACTIVE") return "default"
  if (status === "TRIALING") return "secondary"
  if (status === "PAST_DUE") return "destructive"
  return "outline"
}

interface EditForm {
  planCode: string
  status: SubscriptionStatus
  interval: BillingInterval
  currentPeriodEnd: string
  trialEndsAt: string
  graceEndsAt: string
  payerEmail: string
}

export function SubscriptionsTable({
  initial,
  plans,
}: {
  initial: PlatformOrganization[]
  plans: Plan[]
}) {
  const router = useRouter()
  const [organizations] = React.useState(initial)
  const [search, setSearch] = React.useState("")
  const [editing, setEditing] = React.useState<PlatformOrganization | null>(null)
  const [form, setForm] = React.useState<EditForm | null>(null)
  const [pending, setPending] = React.useState(false)

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return organizations
    return organizations.filter(
      (organization) =>
        organization.name.toLowerCase().includes(term) ||
        organization.slug.toLowerCase().includes(term) ||
        (organization.domain ?? "").toLowerCase().includes(term)
    )
  }, [organizations, search])

  function open(organization: PlatformOrganization) {
    setEditing(organization)
    setForm({
      planCode: organization.plan?.code ?? "esencial",
      status: organization.status ?? "ACTIVE",
      interval: organization.interval ?? "MONTH",
      currentPeriodEnd: toInputDate(organization.currentPeriodEnd),
      trialEndsAt: toInputDate(organization.trialEndsAt),
      graceEndsAt: toInputDate(organization.graceEndsAt),
      payerEmail: "",
    })
  }

  async function save() {
    if (!editing || !form) return

    setPending(true)
    const result = await updateOrganizationSubscription(editing.id, {
      planCode: form.planCode,
      status: form.status,
      interval: form.interval,
      currentPeriodEnd: form.currentPeriodEnd
        ? new Date(`${form.currentPeriodEnd}T23:59:59`).toISOString()
        : null,
      trialEndsAt: form.trialEndsAt
        ? new Date(`${form.trialEndsAt}T23:59:59`).toISOString()
        : null,
      graceEndsAt: form.graceEndsAt
        ? new Date(`${form.graceEndsAt}T23:59:59`).toISOString()
        : null,
      ...(form.payerEmail.trim()
        ? { payerEmail: form.payerEmail.trim() }
        : {}),
    })

    if (!result.ok || !result.data) {
      toast.error(result.message ?? "No se pudo actualizar la suscripción")
      setPending(false)
      return
    }

    toast.success("Suscripción actualizada")
    setEditing(null)
    setForm(null)
    setPending(false)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Negocios</CardTitle>
        <CardDescription>
          Cambios manuales de plan, estado y fechas. Al guardar se cancela el
          cobro automático anterior y la cuenta pasa a modo manual.
        </CardDescription>
        <div className="relative w-full max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar negocio, dirección o dominio…"
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Negocio</th>
                <th className="px-4 py-2 font-medium">Plan</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Periodo</th>
                <th className="px-4 py-2 text-right font-medium">Sucursales</th>
                <th className="px-4 py-2 text-right font-medium">Usuarios</th>
                <th className="px-4 py-2 text-right font-medium">Almacenamiento</th>
                <th className="px-4 py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((organization) => (
                <tr key={organization.id} className="border-t align-top">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{organization.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {organization.domain ?? `${organization.slug}.mishef.co`}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {organization.plan?.name ?? "—"}
                    <span className="block text-xs text-muted-foreground">
                      {organization.interval === "YEAR" ? "Anual" : "Mensual"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(organization.status)}>
                      {organization.status
                        ? SUBSCRIPTION_STATUS_LABELS[organization.status]
                        : "Sin suscripción"}
                    </Badge>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {organization.provider === "MANUAL" ? "Manual" : "Mercado Pago"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {organization.status === "TRIALING" ? (
                      <div>Prueba hasta {formatDate(organization.trialEndsAt)}</div>
                    ) : organization.status === "PAST_DUE" ? (
                      <div>Gracia hasta {formatDate(organization.graceEndsAt)}</div>
                    ) : (
                      <div>Hasta {formatDate(organization.currentPeriodEnd)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {organization.branches}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {organization.users}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatBytes(organization.storageBytes)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => open(organization)}
                    >
                      <PencilIcon />
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No hay negocios que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null)
            setForm(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar suscripción</DialogTitle>
            <DialogDescription>{editing?.name}</DialogDescription>
          </DialogHeader>

          {form ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel>Plan</FieldLabel>
                <Select
                  value={form.planCode}
                  onValueChange={(value) =>
                    setForm((current) =>
                      current ? { ...current, planCode: value ?? "" } : current
                    )
                  }
                  items={plans.map((plan) => ({
                    value: plan.code,
                    label: plan.name,
                  }))}
                >
                  <SelectTrigger aria-label="Plan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.code}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Estado</FieldLabel>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((current) =>
                      current
                        ? {
                            ...current,
                            status: (value ?? "ACTIVE") as SubscriptionStatus,
                          }
                        : current
                    )
                  }
                  items={Object.entries(SUBSCRIPTION_STATUS_LABELS).map(
                    ([value, label]) => ({ value, label })
                  )}
                >
                  <SelectTrigger aria-label="Estado">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SUBSCRIPTION_STATUS_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Intervalo</FieldLabel>
                <Select
                  value={form.interval}
                  onValueChange={(value) =>
                    setForm((current) =>
                      current
                        ? {
                            ...current,
                            interval: (value ?? "MONTH") as BillingInterval,
                          }
                        : current
                    )
                  }
                  items={[
                    { value: "MONTH", label: "Mensual" },
                    { value: "YEAR", label: "Anual" },
                  ]}
                >
                  <SelectTrigger aria-label="Intervalo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTH">Mensual</SelectItem>
                    <SelectItem value="YEAR">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="sub-end">Fin del periodo</FieldLabel>
                <Input
                  id="sub-end"
                  type="date"
                  value={form.currentPeriodEnd}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, currentPeriodEnd: event.target.value }
                        : current
                    )
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="sub-trial">Fin de prueba</FieldLabel>
                <Input
                  id="sub-trial"
                  type="date"
                  value={form.trialEndsAt}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, trialEndsAt: event.target.value }
                        : current
                    )
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="sub-grace">Fin de gracia</FieldLabel>
                <Input
                  id="sub-grace"
                  type="date"
                  value={form.graceEndsAt}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, graceEndsAt: event.target.value }
                        : current
                    )
                  }
                />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="sub-email">Correo de facturación</FieldLabel>
                <Input
                  id="sub-email"
                  type="email"
                  value={form.payerEmail}
                  placeholder="Dejar vacío para conservar el actual"
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, payerEmail: event.target.value }
                        : current
                    )
                  }
                />
                <FieldDescription>
                  Solo se envía si escribes uno nuevo.
                </FieldDescription>
              </Field>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(null)
                setForm(null)
              }}
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
