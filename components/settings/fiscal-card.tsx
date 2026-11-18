"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { FileTextIcon, Loader2Icon, SaveIcon } from "lucide-react"
import { toast } from "sonner"

import { saveFiscalProfile } from "@/lib/fiscal-actions"
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
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useActionForm } from "@/hooks/use-action-form"
import { sameText } from "@/lib/diff"
import {
  CFDI_USE_OPTIONS,
  RFC_PATTERN,
  TAX_REGIME_OPTIONS,
  normalizeRfc,
  type FiscalProfile,
} from "@/lib/fiscal"

interface FormState {
  rfc: string
  legalName: string
  taxRegime: string
  zipCode: string
  cfdiUse: string
  email: string
}

function initialState(profile: FiscalProfile | null): FormState {
  return {
    rfc: profile?.rfc ?? "",
    legalName: profile?.legalName ?? "",
    taxRegime: profile?.taxRegime ?? "601",
    zipCode: profile?.zipCode ?? "",
    cfdiUse: profile?.cfdiUse ?? "G03",
    email: profile?.email ?? "",
  }
}

/**
 * Datos fiscales del negocio.
 *
 * Fase 0 de CFDI: solo se capturan y validan. No se timbra ni se envía nada al
 * SAT; el XML/PDF se activa cuando se conecte el PAC.
 */
export function FiscalCard({
  profile,
  canManage,
}: {
  profile: FiscalProfile | null
  canManage: boolean
}) {
  const router = useRouter()
  const { pending, error, run } = useActionForm(() => router.refresh())
  const [form, setForm] = useState<FormState>(() => initialState(profile))
  const [validation, setValidation] = useState<string | null>(null)

  const current = initialState(profile)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  function submit() {
    const rfc = normalizeRfc(form.rfc)
    const legalName = form.legalName.trim()
    const zipCode = form.zipCode.trim()
    const email = form.email.trim()

    if (!RFC_PATTERN.test(rfc)) {
      setValidation("Revisa el RFC: debe tener 12 o 13 caracteres con el formato del SAT.")
      return
    }

    if (legalName.length < 2) {
      setValidation("Escribe la razón social tal como aparece en la constancia fiscal.")
      return
    }

    if (!/^\d{5}$/.test(zipCode)) {
      setValidation("El código postal debe tener 5 dígitos.")
      return
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidation("El correo para facturas no es válido.")
      return
    }

    setValidation(null)

    const changed =
      !sameText(current.rfc, rfc) ||
      !sameText(current.legalName, legalName) ||
      !sameText(current.taxRegime, form.taxRegime) ||
      !sameText(current.zipCode, zipCode) ||
      !sameText(current.cfdiUse, form.cfdiUse) ||
      !sameText(current.email.trim(), email)

    if (!changed) {
      toast.info("Sin cambios")
      return
    }

    run(() =>
      saveFiscalProfile({
        rfc,
        legalName,
        taxRegime: form.taxRegime,
        zipCode,
        cfdiUse: form.cfdiUse,
        email: email || undefined,
      })
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <FileTextIcon className="size-4" />
          Datos fiscales
          {profile ? (
            <Badge variant="secondary" className="px-1.5 text-[10px]">
              Capturados
            </Badge>
          ) : null}
        </CardTitle>
        <CardDescription>
          Se usarán para emitir el CFDI de tu suscripción. Por ahora solo se
          guardan y validan; la emisión se activa en la fase 2.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="fiscal-rfc">
                RFC <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="fiscal-rfc"
                value={form.rfc}
                onChange={(event) => update("rfc", event.target.value)}
                placeholder="XAXX010101000"
                maxLength={13}
                autoCapitalize="characters"
                spellCheck={false}
                disabled={!canManage || pending}
                required
              />
              <FieldDescription>
                Como aparece en tu constancia de situación fiscal.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="fiscal-legal-name">
                Razón social <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="fiscal-legal-name"
                value={form.legalName}
                onChange={(event) => update("legalName", event.target.value)}
                placeholder="Mi Negocio S.A. de C.V."
                maxLength={200}
                disabled={!canManage || pending}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="fiscal-regime">
                Régimen fiscal <span className="text-destructive">*</span>
              </FieldLabel>
              <Select
                value={form.taxRegime}
                onValueChange={(next) => {
                  if (next) update("taxRegime", next)
                }}
                items={[...TAX_REGIME_OPTIONS]}
                disabled={!canManage || pending}
              >
                <SelectTrigger
                  id="fiscal-regime"
                  className="w-full"
                  aria-label="Régimen fiscal"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAX_REGIME_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="fiscal-zip">
                Código postal <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="fiscal-zip"
                value={form.zipCode}
                onChange={(event) => update("zipCode", event.target.value)}
                placeholder="06700"
                inputMode="numeric"
                maxLength={5}
                disabled={!canManage || pending}
                required
              />
              <FieldDescription>
                Domicilio fiscal registrado ante el SAT.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="fiscal-use">Uso del CFDI</FieldLabel>
              <Select
                value={form.cfdiUse}
                onValueChange={(next) => {
                  if (next) update("cfdiUse", next)
                }}
                items={[...CFDI_USE_OPTIONS]}
                disabled={!canManage || pending}
              >
                <SelectTrigger
                  id="fiscal-use"
                  className="w-full"
                  aria-label="Uso del CFDI"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CFDI_USE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="fiscal-email">Correo para facturas</FieldLabel>
              <Input
                id="fiscal-email"
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="facturacion@minegocio.com"
                maxLength={200}
                disabled={!canManage || pending}
              />
              <FieldDescription>
                Ahí se enviarán el XML y el PDF cuando se active la emisión.
              </FieldDescription>
            </Field>
          </div>

          {canManage ? (
            <div>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <SaveIcon />
                )}
                Guardar datos fiscales
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Solo administración puede editar los datos fiscales.
            </p>
          )}

          {validation ? <FieldError>{validation}</FieldError> : null}
          {error ? <FieldError>{error}</FieldError> : null}
        </form>
      </CardContent>
    </Card>
  )
}
