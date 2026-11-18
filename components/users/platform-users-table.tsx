"use client"

import * as React from "react"

import {
  DataTable,
  DATA_TABLE_ALL,
  type DataTableFilter,
} from "@/components/data-table/data-table"
import { createPlatformUserColumns } from "@/components/users/platform-users-columns"
import type { PlatformUser } from "@/lib/users"

const COLUMN_LABELS: Record<string, string> = {
  name: "Usuario",
  organizationName: "Negocio",
  roles: "Rol",
  isActive: "Estado",
  createdAt: "Alta",
}

/**
 * Listado de usuarios de todos los negocios.
 *
 * El filtrado es local sobre las filas que ya trae la API (hasta 1000
 * membresías) para que el selector de negocio responda sin ida y vuelta.
 */
export function PlatformUsersTable({
  users,
  organizations,
}: {
  users: PlatformUser[]
  organizations: Array<{ id: string; name: string }>
}) {
  const [search, setSearch] = React.useState("")
  const [organization, setOrganization] = React.useState(DATA_TABLE_ALL)

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase()

    return users.filter((user) => {
      if (organization !== DATA_TABLE_ALL && user.organizationId !== organization) {
        return false
      }

      if (!term) return true

      return [user.name, user.email, user.username, user.organizationName]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(term))
    })
  }, [users, search, organization])

  const filters = React.useMemo<DataTableFilter[]>(
    () => [
      {
        id: "organization",
        ariaLabel: "Filtrar por negocio",
        placeholder: "Todos los negocios",
        allLabel: "Todos los negocios",
        value: organization,
        onValueChange: setOrganization,
        options: [
          { value: DATA_TABLE_ALL, label: "Todos los negocios" },
          ...organizations.map((item) => ({
            value: item.id,
            label: item.name,
          })),
        ],
      },
    ],
    [organization, organizations]
  )

  const columns = React.useMemo(() => createPlatformUserColumns(), [])

  return (
    <DataTable
      idPrefix="platform-users"
      data={filtered}
      columns={columns}
      getRowId={(user) => `${user.id}:${user.organizationId}`}
      pageResetKey={`${search}|${organization}`}
      tableClassName="[&_td]:py-1.5"
      search={{
        label: "Buscar usuario",
        placeholder: "Buscar por nombre, correo o negocio...",
        value: search,
        onValueChange: setSearch,
      }}
      filters={filters}
      activeFilterCount={organization === DATA_TABLE_ALL ? 0 : 1}
      onClearFilters={() => setOrganization(DATA_TABLE_ALL)}
      columnLabels={COLUMN_LABELS}
      summary={
        <span className="text-xs text-muted-foreground">
          {filtered.length} usuario(s)
        </span>
      }
    />
  )
}
