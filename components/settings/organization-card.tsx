"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Building2Icon } from "lucide-react"
import { toast } from "sonner"

import { renameOrganization } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldDescription } from "@/components/ui/field"
import { sameText } from "@/lib/diff"

/**
 * Nombre visible del negocio.
 *
 * El dominio ya no se edita aquí como texto libre: tiene su propio flujo con
 * CNAME y verificación por TXT (`CustomDomainCard`). Un dominio escrito a mano
 * sin verificar permitía reclamar el de otro negocio.
 */
export function OrganizationCard({
  name,
  canManage,
}: {
  name: string
  canManage: boolean
}) {
  const router = useRouter()
  const [value, setValue] = useState(name)
  const [pending, startTransition] = useTransition()

  if (!canManage) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border/60 p-3 text-sm">
        <Building2Icon className="size-4 shrink-0 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="font-medium">{name}</span>
          <span className="text-muted-foreground">
            Solo un administrador puede cambiar el nombre del negocio.
          </span>
        </div>
      </div>
    )
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (sameText(name, value)) {
      toast.info("Sin cambios")
      return
    }

    startTransition(async () => {
      const result = await renameOrganization({ name: value.trim() })

      if (result.ok) {
        toast.success("Nombre actualizado")
        router.refresh()
      } else {
        toast.error(result.message ?? "No pudimos guardar el nombre")
      }
    })
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          aria-label="Nombre del negocio"
          value={value}
          maxLength={80}
          onChange={(event) => setValue(event.target.value)}
          className="sm:flex-1"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
      <FieldDescription>
        Es el nombre que ven tus clientes en el menú y en los correos.
      </FieldDescription>
    </form>
  )
}
