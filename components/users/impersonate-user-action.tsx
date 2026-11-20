"use client"

import * as React from "react"
import { Loader2Icon, UserRoundSearchIcon } from "lucide-react"
import { toast } from "sonner"

import { startImpersonation } from "@/app/(app)/users/impersonation-actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

/**
 * Abre la sesión de soporte desde una fila del panel.
 *
 * La sesión del usuario objetivo no se toca: se crea una cookie aparte que
 * caduca sola y el superadmin conserva intactas sus propias cookies. Dentro de
 * la sesión se pueden editar los datos del negocio.
 */
export function ImpersonateUserAction({
  userId,
  organizationId,
  userName,
  organizationName,
}: {
  userId: string
  organizationId: string
  userName: string
  organizationName: string
}) {
  const [open, setOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  function confirm() {
    startTransition(async () => {
      const result = await startImpersonation(userId, organizationId)

      if (!result.ok) {
        toast.error(result.message ?? "No pudimos abrir la sesión de soporte")
      }
    })
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <UserRoundSearchIcon data-icon="inline-start" />
        Impersonar
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-sky-500/10 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
              <UserRoundSearchIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>
              ¿Abrir una sesión de soporte como {userName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Verás {organizationName} como este usuario y podrás editar su
              información. Sus sesiones no se cierran ni se modifican, y esta
              sesión caduca sola a los 30 minutos. No podrás cambiar
              contraseñas, 2FA ni la suscripción; las acciones disponibles
              dependen de su rol.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirm} disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              Abrir sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
