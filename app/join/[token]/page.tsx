import type { Metadata } from "next"
import Link from "next/link"

import { AuthShell } from "@/components/auth-shell"
import { JoinForm } from "@/components/join-form"
import { fetchInvitation, roleLabel } from "@/lib/invitations"

export const metadata: Metadata = {
  title: "Aceptar invitación — Mishef",
  robots: { index: false, follow: false },
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const invitation = await fetchInvitation(token)

  if (!invitation) {
    return (
      <AuthShell>
        <div className="flex flex-col gap-3 text-center">
          <h1 className="text-2xl font-bold">Invitación no válida</h1>
          <p className="text-sm text-muted-foreground">
            El enlace caducó, ya fue utilizado o no existe. Pide a un
            administrador que te envíe una nueva.
          </p>
          <Link
            href="/login"
            className="text-sm underline underline-offset-4 hover:text-foreground"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell name={invitation.organizationName}>
      <div className="flex flex-col gap-6">
        <div className="rounded-lg border bg-muted/40 p-4 text-sm">
          <p className="font-medium">{invitation.organizationName}</p>
          <p className="mt-1 text-muted-foreground">
            Rol: {invitation.roles.map(roleLabel).join(", ") || "Mesero"}
          </p>
        </div>
        <JoinForm
          token={token}
          email={invitation.email}
          alreadyHasAccount={invitation.alreadyHasAccount}
        />
      </div>
    </AuthShell>
  )
}
