"use client"

import * as React from "react"
import Link from "next/link"

import { BranchSelect } from "@/components/branch-select"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser, type NavUserData } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import type { Branch } from "@/lib/branches"
import {
  APPLICATION_NAV,
  PLATFORM_NAV,
  SERVICE_NAV,
  SETTINGS_NAV,
  type NavItem,
} from "@/lib/navigation"
import {
  GalleryVerticalEndIcon,
  ReceiptTextIcon,
  UsersIcon,
} from "lucide-react"

/** Convierte la definición compartida en items con el icono ya renderizado. */
function withIcons(items: NavItem[]) {
  return items.map((item) => {
    const Icon = item.icon

    return { ...item, icon: <Icon /> }
  })
}

const navService = withIcons(SERVICE_NAV)
const navApplication = withIcons(APPLICATION_NAV)
const navPlatform = withIcons(PLATFORM_NAV)
const navSecondaryBase = withIcons([SETTINGS_NAV])

export function AppSidebar({
  user,
  organizationName,
  isAdmin = false,
  isPlatformAdmin = false,
  branches = [],
  activeBranchId = null,
  lockedBranch = false,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: NavUserData
  organizationName?: string | null
  isAdmin?: boolean
  isPlatformAdmin?: boolean
  branches?: Branch[]
  activeBranchId?: string | null
  lockedBranch?: boolean
}) {
  const { setOpenMobile } = useSidebar()

  // En móvil el sidebar es un Sheet: al elegir una página debe cerrarse para
  // no seguir tapando el contenido. Se hace en el click, no en un efecto,
  // para no provocar renders en cascada.
  const closeMobileSidebar = React.useCallback(() => {
    setOpenMobile(false)
  }, [setOpenMobile])

  const navSecondary = React.useMemo(
    () => [
      ...(isAdmin
        ? [
            {
              title: "Facturación",
              url: "/billing",
              icon: <ReceiptTextIcon />,
            },
            {
              title: "Usuarios",
              url: "/users",
              icon: <UsersIcon />,
            },
          ]
        : []),
      ...navSecondaryBase,
    ],
    [isAdmin]
  )

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              tooltip={
                isPlatformAdmin
                  ? "Mishef Plataforma"
                  : (organizationName ?? "Mishef")
              }
              render={<Link href={isPlatformAdmin ? "/platform" : "/dashboard"} onClick={closeMobileSidebar} />}
            >
              <GalleryVerticalEndIcon className="size-5!" />
              <span className="truncate text-base font-semibold">
                {isPlatformAdmin
                  ? "Mishef Plataforma"
                  : (organizationName ?? "Mishef")}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {isPlatformAdmin ? (
          <NavMain
            items={navPlatform}
            label="Plataforma"
            onNavigate={closeMobileSidebar}
          />
        ) : (
          <>
            {branches.length > 1 ? (
              <>
                <SidebarGroup>
                  <SidebarGroupLabel>Sucursales</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <BranchSelect
                      branches={branches}
                      activeBranchId={activeBranchId}
                      locked={lockedBranch}
                    />
                  </SidebarGroupContent>
                </SidebarGroup>
                <SidebarSeparator />
              </>
            ) : null}
            <NavMain
              items={navService}
              label="Servicio"
              onNavigate={closeMobileSidebar}
            />
            <SidebarSeparator />
            <NavMain
              items={navApplication}
              label="Aplicación"
              onNavigate={closeMobileSidebar}
            />
            <NavSecondary
              items={navSecondary}
              className="mt-auto"
              onNavigate={closeMobileSidebar}
            />
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
