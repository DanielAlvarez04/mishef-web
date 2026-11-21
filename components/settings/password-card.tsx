"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { KeyRoundIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { changePassword } from "@/app/(app)/settings/security-actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useActionForm } from "@/hooks/use-action-form"

export function PasswordCard() {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")

  const form = useActionForm(() => {
    toast.success("Contraseña actualizada. Inicia sesión de nuevo.")
    router.replace("/login")
    router.refresh()
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error("La confirmación no coincide con la nueva contraseña")
      return
    }

    void form.run(() => changePassword(currentPassword, newPassword))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRoundIcon className="size-4" />
          Contraseña
        </CardTitle>
        <CardDescription>
          Cambia tu contraseña. Se cerrarán todas tus sesiones activas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Field>
            <FieldLabel htmlFor="current-password">
              Contraseña actual
            </FieldLabel>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="new-password">Nueva contraseña</FieldLabel>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">
                Confirmar contraseña
              </FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Mínimo 8 caracteres, con letras y números.
          </p>
          {form.error ? (
            <p role="alert" className="text-sm text-destructive">
              {form.error}
            </p>
          ) : null}
          <Button
            type="submit"
            className="w-fit"
            disabled={
              form.pending ||
              !currentPassword ||
              newPassword.length < 8 ||
              confirmPassword.length < 8
            }
          >
            {form.pending ? <Loader2Icon className="animate-spin" /> : null}
            Guardar contraseña
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
