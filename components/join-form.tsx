"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { API_BASE_URL } from "@/lib/api-base"
import { apiErrorMessage } from "@/lib/http-error"

interface JoinFormProps {
  token: string
  email: string
  alreadyHasAccount: boolean
}

export function JoinForm({ token, email, alreadyHasAccount }: JoinFormProps) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${API_BASE_URL}/public/invitations/${encodeURIComponent(token)}/accept`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim() || undefined,
            password: alreadyHasAccount ? undefined : password,
          }),
        }
      )

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(apiErrorMessage(data, "No pudimos aceptar la invitación"))
      }

      router.push(alreadyHasAccount ? "/login?joined=1" : "/login?created=1")
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No pudimos aceptar la invitación"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-2xl font-bold">Acepta la invitación</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Entrarás como <strong>{email}</strong>.
          </p>
        </div>

        <Field>
          <FieldLabel htmlFor="email">Correo</FieldLabel>
          <Input id="email" type="email" value={email} disabled readOnly />
        </Field>

        {alreadyHasAccount ? (
          <FieldDescription>
            Ya tienes una cuenta en Mishef. Al aceptar, tu cuenta se suma a este
            equipo y podrás entrar con tu contraseña de siempre.
          </FieldDescription>
        ) : (
          <>
            <Field>
              <FieldLabel htmlFor="name">Tu nombre (opcional)</FieldLabel>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Ana Pérez"
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Crea tu contraseña</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <FieldDescription>Al menos 8 caracteres.</FieldDescription>
            </Field>
          </>
        )}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Field>
          <Button type="submit" disabled={loading}>
            {loading ? "Aceptando..." : "Aceptar invitación"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
