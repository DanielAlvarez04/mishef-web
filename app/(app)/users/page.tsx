import { redirect } from "next/navigation"

import { UsersTable } from "@/components/users/users-table"
import { PlatformUsersTable } from "@/components/users/platform-users-table"
import { InviteTeamForm } from "@/components/users/invite-team-form"
import { Card, CardContent } from "@/components/ui/card"
import { apiFetch } from "@/lib/api"
import { getActiveBranch, getBranches } from "@/lib/branch-server"
import { isAdmin, requireUser } from "@/lib/session"
import type { PlatformOrganization } from "@/lib/billing"
import type { InternalUser, PlatformUser } from "@/lib/users"

export default async function UsersPage() {
  const user = await requireUser()

  // El superadmin ve las cuentas de todos los negocios, sin gestión por equipo.
  if (user.isPlatformAdmin) {
    const [usersResponse, organizationsResponse] = await Promise.all([
      apiFetch("/platform/users"),
      apiFetch("/platform/organizations"),
    ])

    const users: PlatformUser[] | null = usersResponse.ok
      ? ((await usersResponse.json()) as PlatformUser[])
      : null
    const organizations: PlatformOrganization[] = organizationsResponse.ok
      ? ((await organizationsResponse.json()) as PlatformOrganization[])
      : []

    return (
      <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Cuentas de todos los negocios. Filtra por negocio o busca por nombre
            o correo.
          </p>
        </div>

        {users ? (
          <PlatformUsersTable
            users={users}
            currentUserId={user.id}
            organizations={organizations.map((organization) => ({
              id: organization.id,
              name: organization.name,
            }))}
          />
        ) : (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              No pudimos cargar los usuarios.
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  if (!isAdmin(user)) {
    redirect("/settings")
  }

  const [response, branches, activeBranch] = await Promise.all([
    apiFetch("/users"),
    getBranches(),
    getActiveBranch(),
  ])

  if (!response.ok) {
    return (
      <div className="@container/main flex flex-1 items-center justify-center px-4 py-10">
        <div className="max-w-md text-center">
          <h2 className="text-lg font-medium">No se pudo cargar el equipo</h2>
          <p className="text-sm text-muted-foreground mt-2">
            La API no respondió correctamente. Comprueba que está en marcha e
            inténtalo de nuevo.
          </p>
        </div>
      </div>
    )
  }

  const users = (await response.json()) as InternalUser[]

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <InviteTeamForm />
      <UsersTable
        users={users}
        branches={branches}
        activeBranch={activeBranch}
        currentUserId={user.id}
      />
    </div>
  )
}
