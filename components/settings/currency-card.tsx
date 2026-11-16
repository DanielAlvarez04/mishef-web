"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CoinsIcon, Loader2Icon, SaveIcon } from "lucide-react"
import { toast } from "sonner"

import { setOrganizationCurrency } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useActionForm } from "@/hooks/use-action-form"
import {
  CURRENCY_OPTIONS,
  isSupportedCurrency,
  type SupportedCurrency,
} from "@/lib/currency-config"
import { sameText } from "@/lib/diff"

/**
 * Moneda del negocio.
 *
 * Todos los importes de la app (catálogo, POS, reportes) se muestran con este
 * código ISO 4217. Cambiarla no convierte importes históricos: solo cambia el
 * formato con el que se presentan.
 */
export function CurrencyCard({
  currency,
  canManage,
}: {
  currency: string
  canManage: boolean
}) {
  const router = useRouter()
  const { pending, error, run } = useActionForm(() => router.refresh())
  const current: SupportedCurrency = isSupportedCurrency(currency)
    ? currency
    : "MXN"
  const [value, setValue] = useState<SupportedCurrency>(current)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CoinsIcon className="size-4" />
          Moneda
        </CardTitle>
        <CardDescription>
          Se usa en los precios, cobros y reportes del negocio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()

            if (sameText(current, value)) {
              toast.info("Sin cambios")
              return
            }

            run(() => setOrganizationCurrency(value))
          }}
        >
          <div className="flex flex-wrap items-end gap-3">
            <Field className="max-w-64">
              <FieldLabel htmlFor="organization-currency">Moneda</FieldLabel>
              <Select
                value={value}
                onValueChange={(next) =>
                  setValue(
                    isSupportedCurrency(next) ? next : current
                  )
                }
                items={CURRENCY_OPTIONS}
                disabled={!canManage || pending}
              >
                <SelectTrigger
                  id="organization-currency"
                  className="w-full"
                  aria-label="Moneda del negocio"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                Los importes se muestran como {value} 500.00. No se convierten
                los importes ya registrados.
              </FieldDescription>
            </Field>

            {canManage ? (
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <SaveIcon />
                )}
                Guardar moneda
              </Button>
            ) : null}
          </div>

          {!canManage ? (
            <p className="text-xs text-muted-foreground">
              Solo administración puede cambiar la moneda del negocio.
            </p>
          ) : null}

          {error ? <FieldError>{error}</FieldError> : null}
        </form>
      </CardContent>
    </Card>
  )
}
