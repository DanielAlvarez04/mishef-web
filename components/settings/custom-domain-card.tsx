"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { CheckCircle2Icon, GlobeIcon } from "lucide-react"
import { toast } from "sonner"

import {
  connectCustomDomain,
  removeCustomDomain,
  verifyCustomDomain,
} from "@/app/(app)/settings/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export interface CustomDomainProps {
  domain: string | null
  domainToken: string | null
  domainVerifiedAt: string | null
  /** El plan contratado incluye dominio propio. */
  enabled: boolean
  cnameTarget: string
  canManage: boolean
}

/**
 * Dominio propio con verificación real.
 *
 * Flujo: el negocio escribe su dominio → se genera un token → publica un CNAME
 * hacia el subdominio de Mishef y un TXT `_mishef.<dominio>` → “Verificar”
 * consulta el DNS y, solo si ambos coinciden, el dominio empieza a resolver.
 */
export function CustomDomainCard({
  domain,
  domainToken,
  domainVerifiedAt,
  enabled,
  cnameTarget,
  canManage,
}: CustomDomainProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [value, setValue] = useState("")
  const [checks, setChecks] = useState<{ txt: boolean; cname: boolean } | null>(
    null
  )

  if (!canManage) return null

  const verified = Boolean(domainVerifiedAt)

  function connect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setChecks(null)

    startTransition(async () => {
      const result = await connectCustomDomain(value)

      if (result.ok) {
        toast.success("Dominio guardado. Ahora publica los registros DNS.")
        router.refresh()
      } else {
        toast.error(result.message ?? "No pudimos conectar el dominio")
      }
    })
  }

  function verify() {
    startTransition(async () => {
      const result = await verifyCustomDomain()

      if (!result.ok) {
        toast.error(result.message ?? "No pudimos verificar el dominio")
        return
      }

      const data = result.data
      setChecks(data?.checks ?? null)

      if (data?.verified) {
        toast.success("Dominio verificado")
        router.refresh()
      } else {
        toast.error("El DNS todavía no coincide. Revisa los registros.")
      }
    })
  }

  function disconnect() {
    startTransition(async () => {
      const result = await removeCustomDomain()

      if (result.ok) {
        toast.success("Dominio desconectado")
        router.refresh()
      } else {
        toast.error(result.message ?? "No pudimos desconectar el dominio")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GlobeIcon className="size-4" /> Dominio propio
        </CardTitle>
        <CardDescription>
          Usa tu propio dominio, por ejemplo <code>app.micafeteria.com</code>, en
          lugar de un subdominio de Mishef.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!enabled ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Tu plan actual no incluye dominio propio. Puedes seguir usando tu
            dirección <code>{cnameTarget.replace(/^[^.]*\./, "")}</code> y, si
            quieres conectar <code>app.tunegocio.com</code>, actualiza tu plan.
          </div>
        ) : !domain ? (
          <form className="flex flex-col gap-3" onSubmit={connect}>
            <Field>
              <FieldLabel htmlFor="custom-domain">Dominio</FieldLabel>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="custom-domain"
                  placeholder="app.micafeteria.com"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  autoCapitalize="none"
                  spellCheck={false}
                  className="sm:flex-1"
                />
                <Button type="submit" disabled={pending || !value.trim()}>
                  Conectar
                </Button>
              </div>
              <FieldDescription>
                Debe ser un subdominio tuyo (no el dominio raíz) para poder
                apuntarlo con un CNAME.
              </FieldDescription>
            </Field>
          </form>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{domain}</span>
              {verified ? (
                <Badge className="gap-1 bg-emerald-600 text-white">
                  <CheckCircle2Icon className="size-3" /> Verificado
                </Badge>
              ) : (
                <Badge variant="outline">Pendiente de DNS</Badge>
              )}
            </div>

            <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
              <p className="font-medium">Registros que debes publicar</p>

              <dl className="grid gap-3">
                <div className="grid gap-1">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    CNAME · {domain}
                  </dt>
                  <dd className="flex items-center gap-2">
                    <code className="break-all rounded bg-background px-2 py-1">
                      {cnameTarget}
                    </code>
                    {checks ? (
                      <span
                        className={
                          checks.cname
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive"
                        }
                      >
                        {checks.cname ? "OK" : "falta"}
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    TXT · _mishef.{domain}
                  </dt>
                  <dd className="break-all">
                    <code className="rounded bg-background px-2 py-1">
                      {domainToken ?? "—"}
                    </code>
                  </dd>
                </div>
              </dl>

              {!verified ? (
                <p className="text-xs text-muted-foreground">
                  Publica los dos registros en tu proveedor de DNS y pulsa
                  Verificar. La propagación puede tardar unos minutos.
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {!verified ? (
                <Button type="button" onClick={verify} disabled={pending}>
                  {pending ? "Comprobando..." : "Verificar DNS"}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={disconnect}
                disabled={pending}
              >
                Desconectar
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
