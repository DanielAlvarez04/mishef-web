"use client"

import { createColumnHelper } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { ROLE_OPTIONS, type PlatformUser, type RoleCode } from "@/lib/users"

import { ImpersonateUserAction } from "./impersonate-user-action"
import type { UsersTableFeatures } from "./data-table-features"

const columnHelper = createColumnHelper<UsersTableFeatures, PlatformUser>()

const dateFormat = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

function roleLabel(role: RoleCode): string {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role
}

/** Columnas del listado transversal de usuarios del panel de plataforma. */
export function createPlatformUserColumns(currentUserId: string) {
  return columnHelper.columns([
    columnHelper.accessor("name", {
      header: () => <span className="font-medium">Usuario</span>,
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium">
              {row.original.name ?? row.original.username ?? "Sin nombre"}
            </span>
            {row.original.isPlatformAdmin ? (
              <Badge variant="secondary" className="px-1.5 text-[10px]">
                Plataforma
              </Badge>
            ) : null}
          </div>
          <span className="text-xs text-muted-foreground">
            {row.original.email ?? row.original.username ?? "Sin correo"}
          </span>
        </div>
      ),
      sortFn: "text",
    }),
    columnHelper.accessor("organizationName", {
      header: () => <span className="font-medium">Negocio</span>,
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">{row.original.organizationName}</span>
          <span className="text-xs text-muted-foreground">
            {row.original.organizationSlug}
          </span>
        </div>
      ),
      sortFn: "text",
    }),
    columnHelper.accessor("roles", {
      header: () => <span className="font-medium">Rol</span>,
      cell: ({ row }) =>
        row.original.roles.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.original.roles.map((role) => (
              <Badge key={role} variant="outline" className="px-1.5 text-xs">
                {roleLabel(role)}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Sin rol</span>
        ),
      enableSorting: false,
    }),
    columnHelper.accessor("isActive", {
      header: () => <span className="font-medium">Estado</span>,
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant={row.original.isActive ? "success" : "secondary"}>
            {row.original.isActive ? "Activo" : "Inactivo"}
          </Badge>
          {row.original.twoFactorEnabled ? (
            <Badge variant="outline" className="px-1.5 text-[10px]">
              2FA
            </Badge>
          ) : null}
        </div>
      ),
      enableSorting: false,
    }),
    columnHelper.accessor("createdAt", {
      header: () => <span className="font-medium">Alta</span>,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {dateFormat.format(new Date(row.original.createdAt))}
        </span>
      ),
      enableSorting: false,
    }),
    columnHelper.display({
      id: "actions",
      header: () => <span className="font-medium">Acciones</span>,
      cell: ({ row }) => {
        const user = row.original

        // Un superadmin no se impersona a sí mismo, ni a otra cuenta de
        // plataforma, ni a usuarios inactivos.
        if (
          !user.isActive ||
          user.isPlatformAdmin ||
          user.id === currentUserId
        ) {
          return <span className="text-xs text-muted-foreground">—</span>
        }

        return (
          <ImpersonateUserAction
            userId={user.id}
            organizationId={user.organizationId}
            userName={
              user.name ?? user.username ?? user.email ?? "este usuario"
            }
            organizationName={user.organizationName}
          />
        )
      },
      enableSorting: false,
    }),
  ])
}
