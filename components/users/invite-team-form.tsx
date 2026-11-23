"use client"

import { useActionState } from "react"

import { inviteTeamMember } from "@/app/(app)/users/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ActionResult } from "@/lib/server-api"

async function action(
  _previous: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return inviteTeamMember(formData)
}

/**
 * Alta de personal por invitación.
 *
 * No crea la cuenta en el momento: envía un correo con un enlace de un solo
 * uso. Así la persona elige su propia contraseña y nunca viaja por WhatsApp.
 */
export function InviteTeamForm() {
  const [state, formAction, pending] = useActionState(action, null)

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border p-4"
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium">Invitar por correo</h3>
        <p className="text-xs text-muted-foreground">
          Le enviaremos un enlace para que cree su contraseña y entre al equipo.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          type="email"
          name="email"
          placeholder="ana@cafeteria.com"
          autoComplete="off"
          required
          className="sm:flex-1"
        />
        <select
          name="roles"
          defaultValue="WAITER"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <option value="WAITER">Mesero</option>
          <option value="KITCHEN">Cocina</option>
          <option value="CASHIER">Cajero</option>
          <option value="INVENTORY_MANAGER">Inventario</option>
          <option value="SUPERVISOR">Supervisor</option>
          <option value="ADMIN">Administrador</option>
        </select>
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando..." : "Enviar invitación"}
        </Button>
      </div>

      {state?.ok ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Invitación enviada.
        </p>
      ) : null}

      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message ?? "No pudimos enviar la invitación"}
        </p>
      ) : null}
    </form>
  )
}
