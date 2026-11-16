"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { CopyIcon, GlobeIcon } from "lucide-react"
import { toast } from "sonner"

import { changeOrganizationSlug } from "@/app/(app)/settings/actions"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const TENANT_DOMAIN = process.env.NEXT_PUBLIC_TENANT_DOMAIN ?? "mishef.co"

/**
 * Dirección del negocio.
 *
 * Se fija en el registro/onboarding y solo puede cambiarse **una vez**. El slug
 * anterior queda como alias en el servidor, así que los enlaces y QR viejos
 * siguen funcionando con un 301.
 */
export function AddressCard({
  slug,
  slugChanges,
  canManage,
}: {
  slug: string
  slugChanges: number
  canManage: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(slug)
  const [pending, startTransition] = useTransition()

  if (!canManage) return null

  const remaining = Math.max(0, 1 - slugChanges)
  const address = `${slug}.${TENANT_DOMAIN}`

  function copy() {
    void navigator.clipboard
      ?.writeText(`https://${address}`)
      .then(() => toast.success("Dirección copiada"))
      .catch(() => toast.error("No se pudo copiar"))
  }

  function submit() {
    startTransition(async () => {
      const result = await changeOrganizationSlug(value.trim())

      if (!result.ok) {
        toast.error(result.message ?? "No pudimos cambiar la dirección")
        return
      }

      toast.success(`Ahora tu dirección es ${result.data?.slug}.${TENANT_DOMAIN}`)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GlobeIcon className="size-4" /> Tu dirección
        </CardTitle>
        <CardDescription>
          Es la dirección con la que tu equipo y tus clientes entran a Mishef.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded bg-muted px-2 py-1 text-sm">{address}</code>
          <Button type="button" size="sm" variant="outline" onClick={copy}>
            <CopyIcon data-icon="inline-start" /> Copiar
          </Button>
        </div>

        {remaining > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Te queda <strong>1 cambio</strong> de dirección. El anterior
              seguirá funcionando como redirección.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => setOpen(true)}
            >
              Cambiar dirección
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ya usaste tu cambio de dirección. Esta es la definitiva.
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          El dominio propio, si tu plan lo incluye, se configura más abajo.
        </p>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar tu dirección</DialogTitle>
            <DialogDescription>
              Vas a usar tu único cambio. Los enlaces anteriores seguirán
              funcionando, pero <strong>{value || slug}.{TENANT_DOMAIN}</strong>{" "}
              será la definitiva.
            </DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor="new-slug">Nueva dirección</FieldLabel>
            <div className="flex items-stretch overflow-hidden rounded-md border border-input focus-within:ring-2 focus-within:ring-ring/50">
              <Input
                id="new-slug"
                value={value}
                onChange={(event) =>
                  setValue(
                    event.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "-")
                      .replace(/-+/g, "-")
                      .slice(0, 32)
                  )
                }
                className="rounded-none border-0 shadow-none focus-visible:ring-0"
              />
              <span className="flex items-center border-l border-input bg-muted px-3 text-sm text-muted-foreground">
                .{TENANT_DOMAIN}
              </span>
            </div>
            <FieldDescription>
              Se comprueba al guardar: si está ocupada o reservada, te lo diremos.
            </FieldDescription>
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={pending || value.trim() === slug}
            >
              {pending ? "Cambiando..." : "Usar mi cambio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
