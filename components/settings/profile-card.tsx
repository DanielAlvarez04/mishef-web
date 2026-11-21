"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon, UserRoundIcon } from "lucide-react"
import { toast } from "sonner"

import { updateOwnProfile } from "@/app/(app)/settings/profile-actions"
import { resendVerification } from "@/app/(app)/settings/security-actions"
import { AvailabilityLabel } from "@/components/availability-field"
import { Badge } from "@/components/ui/badge"
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
import { useUsernameStatus } from "@/components/users/username-field"
import { useActionForm } from "@/hooks/use-action-form"
import { sameText } from "@/lib/diff"

export function ProfileCard({
  name,
  username,
  email,
  emailVerified,
}: {
  name: string | null
  username: string | null
  email: string | null
  emailVerified: boolean
}) {
  const router = useRouter()
  const [nameValue, setNameValue] = React.useState(name ?? "")
  const [usernameValue, setUsernameValue] = React.useState(username ?? "")
  const [emailValue, setEmailValue] = React.useState(email ?? "")
  const [resending, setResending] = React.useState(false)
  const usernameStatus = useUsernameStatus(usernameValue, {
    currentUsername: username,
  })

  const form = useActionForm(() => {
    toast.success("Perfil actualizado")
    router.refresh()
  })

  async function handleResend() {
    setResending(true)

    try {
      const result = await resendVerification()
      if (result.ok) {
        toast.success("Te enviamos un nuevo correo de verificación")
      } else {
        toast.error(result.message ?? "No pudimos enviar el correo")
      }
    } finally {
      setResending(false)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (email && !emailValue.trim()) {
      toast.error("El correo no puede quedar vacío")
      return
    }

    const changes = {
      ...(sameText(name ?? "", nameValue)
        ? {}
        : { name: nameValue.trim() }),
      ...(sameText(username ?? "", usernameValue)
        ? {}
        : { username: usernameValue.trim() }),
      ...(sameText(email ?? "", emailValue)
        ? {}
        : { email: emailValue.trim() }),
    }

    if (Object.keys(changes).length === 0) {
      toast.info("Sin cambios")
      return
    }

    if (changes.email) {
      toast.info("Te enviaremos un correo para verificar la nueva dirección")
    }

    void form.run(() => updateOwnProfile(changes))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRoundIcon className="size-4" />
          Perfil
        </CardTitle>
        <CardDescription>
          Tu nombre, usuario local y correo de contacto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="profile-name">Nombre</FieldLabel>
              <Input
                id="profile-name"
                value={nameValue}
                maxLength={80}
                onChange={(event) => setNameValue(event.target.value)}
              />
            </Field>
            <Field>
              <AvailabilityLabel
                htmlFor="profile-username"
                label="Usuario"
                status={usernameStatus}
              />
              <Input
                id="profile-username"
                value={usernameValue}
                maxLength={32}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                onChange={(event) => setUsernameValue(event.target.value)}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="profile-email">Correo</FieldLabel>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="profile-email"
                type="email"
                value={emailValue}
                maxLength={120}
                autoComplete="email"
                onChange={(event) => setEmailValue(event.target.value)}
              />
              {emailValue ? (
                emailVerified ? (
                  <Badge variant="secondary">Verificado</Badge>
                ) : (
                  <Badge variant="outline">Sin verificar</Badge>
                )
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Cambiar el correo desactiva 2FA hasta que verifiques la nueva
              dirección.
            </p>
          </Field>

          {email && !emailVerified ? (
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? <Loader2Icon className="animate-spin" /> : null}
              Reenviar verificación
            </Button>
          ) : null}

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
              usernameStatus.state === "checking" ||
              usernameStatus.state === "taken" ||
              usernameStatus.state === "invalid"
            }
          >
            {form.pending ? <Loader2Icon className="animate-spin" /> : null}
            Guardar perfil
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
