"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CreditCardIcon,
  Loader2Icon,
  PauseIcon,
  PlayIcon,
  RefreshCwIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  cancelSubscription,
  changePlan,
  getUpgradeQuote,
  pauseSubscription,
  resumeSubscription,
  subscribePlan,
  syncSubscription,
} from "@/app/(app)/billing/actions"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  formatBytes,
  formatMoney,
  INTERVAL_LABELS,
  planPrice,
  planQuote,
  SUBSCRIPTION_STATUS_LABELS,
  type BillingInterval,
  type Plan,
  type Subscription,
  type SubscriptionPayment,
  type UpgradeQuote,
} from "@/lib/billing"
import { cn } from "@/lib/utils"

function formatDate(value: string | null): string {
  if (!value) return "—"
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
  }).format(new Date(value))
}

function statusVariant(
  status: Subscription["status"]
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "ACTIVE") return "default"
  if (status === "TRIALING") return "secondary"
  if (status === "PAST_DUE") return "destructive"
  return "outline"
}

export function BillingView({
  subscription,
  plans,
  payments,
}: {
  subscription: Subscription
  plans: Plan[]
  payments: SubscriptionPayment[]
}) {
  const router = useRouter()
  const [interval, setInterval] = React.useState<BillingInterval>(
    subscription.interval,
  )
  const [pending, setPending] = React.useState<string | null>(null)
  const [subscribePlanCode, setSubscribePlanCode] = React.useState<
    string | null
  >(null)
  const [upgradePlanCode, setUpgradePlanCode] = React.useState<string | null>(
    null,
  )
  const [payerEmail, setPayerEmail] = React.useState(
    subscription.payerEmail ?? "",
  )
  const [quote, setQuote] = React.useState<UpgradeQuote | null>(null)
  const [confirmCancel, setConfirmCancel] = React.useState(false)
  const [confirmPause, setConfirmPause] = React.useState(false)

  const currentPlan = subscription.plan
  const publicPlans = plans
    .filter((plan) => plan.isActive && plan.isPublic)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const selectedPlan = publicPlans.find(
    (plan) => plan.code === subscribePlanCode,
  ) ?? null
  const upgradePlan = publicPlans.find(
    (plan) => plan.code === upgradePlanCode,
  ) ?? null

  function run(
    key: string,
    action: () => Promise<{ ok: boolean; message?: string }>,
    success?: string,
  ) {
    setPending(key)
    void action()
      .then((result) => {
        if (!result.ok) {
          toast.error(result.message ?? "No se pudo completar la operación")
          return
        }
        if (success) toast.success(success)
        router.refresh()
      })
      .finally(() => setPending(null))
  }

  function openSubscribe(plan: Plan) {
    setSubscribePlanCode(plan.code)
    setQuote(null)
  }

  async function openUpgrade(plan: Plan) {
    setUpgradePlanCode(plan.code)
    setQuote(null)
    setPending("quote")

    const result = await getUpgradeQuote(plan.code, interval)

    if (!result.ok || !result.data) {
      toast.error(result.message ?? "No se pudo cotizar el cambio")
      setUpgradePlanCode(null)
    } else {
      setQuote(result.data)
    }

    setPending(null)
  }

  async function submitSubscribe() {
    if (!selectedPlan) return

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail.trim())) {
      toast.error("Escribe un correo válido para la facturación")
      return
    }

    setPending("subscribe")
    const result = await subscribePlan({
      planCode: selectedPlan.code,
      interval,
      payerEmail: payerEmail.trim(),
    })

    if (!result.ok || !result.data) {
      toast.error(result.message ?? "No se pudo iniciar la suscripción")
      setPending(null)
      return
    }

    window.location.assign(result.data.initPoint)
  }

  async function submitUpgrade() {
    if (!upgradePlan) return

    setPending("upgrade")
    const result = await changePlan({
      planCode: upgradePlan.code,
      interval,
    })

    if (!result.ok || !result.data) {
      toast.error(result.message ?? "No se pudo cambiar de plan")
      setPending(null)
      return
    }

    if (result.data.applied) {
      toast.success("Plan actualizado")
      setUpgradePlanCode(null)
      setPending(null)
      router.refresh()
      return
    }

    if (!result.data.initPoint) {
      toast.error("Mercado Pago no devolvió el link de pago")
      setPending(null)
      return
    }

    window.location.assign(result.data.initPoint)
  }

  const usage = subscription.usage
  const limits = currentPlan

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <CreditCardIcon className="size-4" />
            Tu plan
            <Badge variant={statusVariant(subscription.status)}>
              {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
            </Badge>
            {subscription.isLegacy ? (
              <Badge variant="outline">Legacy</Badge>
            ) : null}
          </CardTitle>
          <CardDescription>
            {subscription.isLegacy
              ? "Tu cuenta conserva el acceso completo sin costo."
              : "La suscripción se renueva automáticamente con Mercado Pago."}
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold">{currentPlan.name}</p>
              <p className="text-sm text-muted-foreground">
                {planQuote(currentPlan, subscription.interval)}
              </p>
            </div>
            <div className="text-right text-sm">
              {subscription.status === "TRIALING" ? (
                <p className="font-medium">
                  Prueba: {subscription.daysLeft} día(s) restantes
                </p>
              ) : (
                <p className="font-medium">
                  {subscription.status === "PAST_DUE"
                    ? `Gracia: ${subscription.daysLeft} día(s)`
                    : `Próximo cobro: ${formatDate(subscription.nextChargeAt)}`}
                </p>
              )}
              <p className="text-muted-foreground">
                {subscription.quantity} sucursal(es) ·{" "}
                {INTERVAL_LABELS[subscription.interval]}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Usage
              label="Sucursales"
              value={`${usage.branches}${limits.maxBranches ? ` / ${limits.maxBranches}` : ""}`}
            />
            <Usage
              label="Usuarios"
              value={`${usage.users}${
                limits.maxUsersPerBranch
                  ? ` / ${limits.maxUsersPerBranch * Math.max(1, usage.branches)}`
                  : ""
              }`}
            />
            <Usage
              label="Almacenamiento"
              value={`${formatBytes(usage.storageBytes)}${
                limits.maxStorageBytes
                  ? ` / ${formatBytes(limits.maxStorageBytes)}`
                  : " / sin límite"
              }`}
            />
          </div>

          {!subscription.canWrite ? (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              La suscripción está vencida. El negocio está en solo lectura
              hasta que se renueve.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {subscription.providerPreapprovalId ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    run("sync", syncSubscription, "Suscripción sincronizada")
                  }
                  disabled={pending !== null}
                >
                  {pending === "sync" ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <RefreshCwIcon />
                  )}
                  Sincronizar
                </Button>
                {subscription.status === "PAUSED" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      run("resume", resumeSubscription, "Suscripción reactivada")
                    }
                    disabled={pending !== null}
                  >
                    <PlayIcon />
                    Reactivar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmPause(true)}
                    disabled={pending !== null}
                  >
                    <PauseIcon />
                    Pausar
                  </Button>
                )}
                {subscription.status !== "CANCELED" ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmCancel(true)}
                    disabled={pending !== null}
                  >
                    <XIcon />
                    Cancelar renovación
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Planes</h2>
            <p className="text-sm text-muted-foreground">
              Elige el plan que mejor se adapte a tu operación.
            </p>
          </div>
          <div className="flex rounded-lg border p-1">
            {(["MONTH", "YEAR"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setInterval(value)}
                className={cn(
                  "rounded-md px-3 py-1 text-sm",
                  interval === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {INTERVAL_LABELS[value]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {publicPlans.map((plan) => {
            const isCurrent = plan.id === currentPlan.id
            const currentTotal = planPrice(currentPlan, interval)
            const targetTotal = planPrice(plan, interval)
            const isUpgrade = targetTotal > currentTotal
            const isDowngrade = targetTotal < currentTotal
            const canSubscribe =
              subscription.isLegacy ||
              subscription.status === "TRIALING" ||
              subscription.status === "EXPIRED" ||
              subscription.status === "CANCELED"
            const disabled =
              (isCurrent && !canSubscribe) || (isDowngrade && !canSubscribe)

            return (
              <Card key={plan.id} className={cn(isCurrent && "ring-primary")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SparklesIcon className="size-4" />
                    {plan.name}
                    {isCurrent ? <Badge>Plan actual</Badge> : null}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <p className="text-2xl font-semibold">
                    {planQuote(plan, interval)}
                  </p>
                </CardHeader>
                <CardContent className="gap-4">
                  <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                    <li>
                      {plan.maxBranches
                        ? `${plan.maxBranches} sucursal(es)`
                        : "Sucursales sin límite"}
                    </li>
                    <li>
                      {plan.maxUsersPerBranch
                        ? `${plan.maxUsersPerBranch} usuarios por sucursal`
                        : "Usuarios sin límite"}
                    </li>
                    <li>
                      {plan.maxStorageBytes
                        ? `${formatBytes(plan.maxStorageBytes)} de almacenamiento`
                        : "Almacenamiento sin límite"}
                    </li>
                    <li>
                      {plan.maxImagesPerItem} imagen(es)
                      {plan.maxVideosPerItem > 0
                        ? ` y ${plan.maxVideosPerItem} video`
                        : ""}{" "}
                      por artículo
                    </li>
                    <li>
                      {plan.customDomain
                        ? "Dominio personalizado"
                        : `Dominio ${"negocio.mishef.co"}`}
                    </li>
                    <li>
                      {plan.maxInventoryItems
                        ? `Hasta ${plan.maxInventoryItems} artículos de inventario`
                        : "Artículos de inventario sin límite"}
                    </li>
                  </ul>

                  <Button
                    type="button"
                    className="w-fit"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={disabled || pending !== null}
                    onClick={() => {
                      if (isCurrent && canSubscribe) {
                        openSubscribe(plan)
                      } else if (isUpgrade) {
                        void openUpgrade(plan)
                      } else {
                        openSubscribe(plan)
                      }
                    }}
                  >
                    {disabled
                      ? isDowngrade
                        ? "Bajar al final del periodo"
                        : "Plan actual"
                      : isCurrent && canSubscribe
                        ? "Suscribirme"
                        : isUpgrade
                          ? "Cambiar a este plan"
                          : "Suscribirme"}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pagos de la suscripción</CardTitle>
          <CardDescription>
            Historial de cobros recurrentes y prorrateos.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Fecha</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                  <th className="px-4 py-2 text-right font-medium">Importe</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t">
                    <td className="px-4 py-2">
                      {formatDate(payment.paidAt ?? payment.createdAt)}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {payment.kind === "PLAN_CHANGE" ? "Cambio de plan" : "Suscripción"}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="outline">{payment.status}</Badge>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatMoney(payment.amountCents / 100, payment.currency)}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-sm text-muted-foreground"
                    >
                      Todavía no hay pagos registrados.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={selectedPlan !== null}
        onOpenChange={(open) => {
          if (!open) setSubscribePlanCode(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Suscribirme a {selectedPlan?.name}</DialogTitle>
            <DialogDescription>
              {selectedPlan
                ? planQuote(selectedPlan, interval)
                : null}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <Field>
              <FieldLabel htmlFor="billing-email">Correo de facturación</FieldLabel>
              <Input
                id="billing-email"
                type="email"
                value={payerEmail}
                onChange={(event) => setPayerEmail(event.target.value)}
                placeholder="admin@negocio.com"
              />
              <FieldDescription>
                Mercado Pago lo usa para la suscripción. También llegará el
                comprobante de cobro.
              </FieldDescription>
            </Field>
            <div className="flex rounded-lg border p-1">
              {(["MONTH", "YEAR"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setInterval(value)}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1 text-sm",
                    interval === value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {INTERVAL_LABELS[value]}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSubscribePlanCode(null)}
              disabled={pending !== null}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void submitSubscribe()}
              disabled={pending !== null}
            >
              {pending === "subscribe" ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <CreditCardIcon />
              )}
              Continuar a Mercado Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={upgradePlanCode !== null}
        onOpenChange={(open) => {
          if (!open) {
            setUpgradePlanCode(null)
            setQuote(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar a {upgradePlan?.name}</DialogTitle>
            <DialogDescription>
              Aplicamos el valor de los días que te quedan del plan actual.
            </DialogDescription>
          </DialogHeader>

          {pending === "quote" || !quote ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Calculando la diferencia…
            </p>
          ) : (
            <div className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
              <Row
                label="Valor de los días restantes"
                value={`- ${formatMoney(quote.creditCents / 100, currentPlan.currency)}`}
              />
              <Row
                label={`${quote.targetPlan.name} (${INTERVAL_LABELS[interval]})`}
                value={formatMoney(
                  quote.targetAmountCents / 100,
                  quote.targetPlan.currency,
                )}
              />
              <div className="flex items-center justify-between border-t pt-2 font-medium">
                <span>Pagas ahora</span>
                <span>
                  {formatMoney(
                    quote.amountDueCents / 100,
                    quote.targetPlan.currency,
                  )}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Después se renueva a{" "}
                {formatMoney(
                  quote.targetAmountCents / 100,
                  quote.targetPlan.currency,
                )}{" "}
                cada {interval === "YEAR" ? "año" : "mes"}.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setUpgradePlanCode(null)
                setQuote(null)
              }}
              disabled={pending !== null}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void submitUpgrade()}
              disabled={pending !== null || !quote}
            >
              {pending === "upgrade" ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <CreditCardIcon />
              )}
              Pagar diferencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar la renovación?</AlertDialogTitle>
            <AlertDialogDescription>
              Mantendrás el acceso hasta el final del periodo pagado. Después
              la cuenta pasará a solo lectura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending !== null}>
              Volver
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmCancel(false)
                run("cancel", cancelSubscription, "Renovación cancelada")
              }}
              disabled={pending !== null}
            >
              Cancelar renovación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmPause} onOpenChange={setConfirmPause}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Pausar la suscripción?</AlertDialogTitle>
            <AlertDialogDescription>
              No se harán cobros mientras esté pausada. Puedes reactivarla
              cuando quieras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending !== null}>
              Volver
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmPause(false)
                run("pause", pauseSubscription, "Suscripción pausada")
              }}
              disabled={pending !== null}
            >
              Pausar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Usage({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
