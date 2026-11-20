import { UserRoundSearchIcon } from "lucide-react"

import { stopImpersonation } from "@/app/(app)/users/impersonation-actions"
import { Button } from "@/components/ui/button"

/**
 * Aviso permanente de que la app se está viendo como otro usuario.
 *
 * La sesión permite editar datos del negocio (salvo credenciales, 2FA y
 * suscripción) y caduca sola a los 30 minutos. Salir revoca la sesión de
 * soporte y devuelve al superadmin a su propia sesión, que nunca se tocó.
 */
export function ImpersonationBanner({
  userName,
  organizationName,
  byName,
}: {
  userName: string
  organizationName: string | null
  byName: string | null
}) {
  return (
    <div
      role="status"
      className="border-b bg-sky-500/10 px-4 py-2 text-sm lg:px-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sky-800 dark:text-sky-300">
          <UserRoundSearchIcon className="size-4" />
          <span>Viendo como</span>
          <strong className="font-semibold">{userName}</strong>
          {organizationName ? (
            <span className="text-sky-700/80 dark:text-sky-300/80">
              · {organizationName}
            </span>
          ) : null}
          <span className="text-xs text-sky-700/70 dark:text-sky-300/70">
            · Puedes editar
            {byName ? ` · Soporte de ${byName}` : ""}
          </span>
        </span>
        <form action={stopImpersonation}>
          <Button type="submit" size="sm" variant="outline">
            Salir de la impersonación
          </Button>
        </form>
      </div>
    </div>
  )
}
