"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2Icon, SparklesIcon } from "lucide-react"
import { toast } from "sonner"

import { setIntelEnabled } from "@/app/(app)/settings/actions"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import type { IntelModelInfo, IntelUsage } from "@/lib/intel"
import { cn } from "cn"

/**
 * Tarjeta de Intel: activa el copiloto y muestra el consumo del mes.
 *
 * No muestra claves ni URLs de proveedor; solo los modelos efectivos.
 */
export function IntelCard({
  enabled,
  configured,
  models,
  monthlyTokenLimit,
  usage,
  canManage,
}: {
  enabled: boolean
  configured: boolean
  models: IntelModelInfo[]
  monthlyTokenLimit: number
  usage: IntelUsage
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  const update = (next: boolean) => {
    if (!canManage) return

    startTransition(async () => {
      const result = await setIntelEnabled(next)

      if (!result.ok) {
        toast.error(result.message ?? "No se pudo actualizar Intel")
        return
      }

      toast.success(
        next ? "Intel activado para este negocio" : "Intel desactivado"
      )
      router.refresh()
    })
  }

  const percent =
    monthlyTokenLimit > 0
      ? Math.min(100, Math.round((usage.tokens / monthlyTokenLimit) * 100))
      : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SparklesIcon className="size-4 text-muted-foreground" />
          Intel
        </CardTitle>
        <CardDescription>
          Copiloto del negocio, respuestas con datos reales y consumo medido.
        </CardDescription>
        <CardAction>
          {!configured ? (
            <Badge variant="outline">Sin configurar</Badge>
          ) : enabled ? (
            <Badge variant="secondary">Activo</Badge>
          ) : (
            <Badge variant="outline">Inactivo</Badge>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="gap-4">
        <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-3">
          <div className="flex items-start gap-3">
            <SparklesIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium">
                {!configured
                  ? "Falta configurar el proveedor en el servidor"
                  : enabled
                    ? "El copiloto está disponible para este negocio"
                    : "Actívalo para usar el copiloto y el digest"}
              </span>
              <span className="text-muted-foreground">
                {!configured
                  ? "Agrega NVIDIA_API_KEY o INTEL_API_KEY en el .env de la API y reinicia el servidor."
                  : models.length > 0
                    ? `Modelos: ${models.map((item) => item.model).join(" → ")}`
                    : "Sin modelos configurados."}
              </span>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={update}
            disabled={!canManage || pending || !configured}
            aria-label="Activar Intel"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Consumo de {usage.month}
            </span>
            <span className="font-medium">
              {usage.tokens.toLocaleString("es-MX")} /{" "}
              {monthlyTokenLimit.toLocaleString("es-MX")} tokens
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                percent >= 90
                  ? "bg-destructive"
                  : percent >= 70
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {usage.requests} solicitudes este mes. La cuota se reinicia el día 1.
          </p>
        </div>

        <Link
          href="/intel"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
        >
          {pending ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <SparklesIcon className="size-4" />
          )}
          Abrir copiloto
        </Link>
      </CardContent>
    </Card>
  )
}
