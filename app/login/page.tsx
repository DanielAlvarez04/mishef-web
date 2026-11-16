import { redirect } from "next/navigation"

import { AuthShell } from "@/components/auth-shell"
import { LoginForm } from "@/components/login-form"
import { oauthErrorMessage } from "@/lib/auth-errors"
import { getCurrentUser } from "@/lib/session"
import { getTenant } from "@/lib/tenant"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const user = await getCurrentUser()
  if (user) {
    redirect(user.onboarded ? "/dashboard" : "/onboarding")
  }

  const params = await searchParams
  const tenant = await getTenant()
  const error = oauthErrorMessage(first(params.error))
  const challengeId = first(params.challengeId)
  const email = first(params.email)

  const notice = params.reset
    ? "Contraseña actualizada. Inicia sesión con tu nueva contraseña."
    : params.verified
      ? "Correo verificado. Ya puedes usar tu cuenta."
      : null

  return (
    <AuthShell
      name={tenant?.name}
      color={tenant?.brandColor}
      logoUrl={tenant?.logoUrl}
    >
      <LoginForm
        tenant={tenant?.slug}
        initialIdentifier={email}
        initialError={error}
        notice={notice}
        initialChallenge={
          challengeId ? { challengeId, email: email ?? "" } : undefined
        }
      />
    </AuthShell>
  )
}
