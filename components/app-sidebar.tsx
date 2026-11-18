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
} from "@/components/ui/sidebar"
import type { Branch } from "@/lib/branches"
import {
  BarChart3Icon,
  BadgeDollarSignIcon,
  ChartBarIcon,
  ChefHatIcon,
  ClockIcon,
  CookingPotIcon,
  GalleryVerticalEndIcon,
  LayoutDashboardIcon,
  NotebookTextIcon,
  PackageIcon,
  PercentIcon,
  ReceiptTextIcon,
  Settings2Icon,
  ShieldAlertIcon,
  StoreIcon,
  Trash2Icon,
  ShoppingBasketIcon,
  UsersIcon,
} from "lucide-react"

const data = {
  navService: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Punto de venta",
      url: "/pos",
      icon: <ShoppingBasketIcon />,
    },
    {
      title: "Menús",
      url: "/menus",
      icon: <NotebookTextIcon />,
    },
    {
      title: "Cocina",
      url: "/kitchen",
      icon: <ChefHatIcon />,
    },
  ],
  navApplication: [
    {
      title: "Catálogo",
      url: "/catalog",
      icon: <CookingPotIcon />,
    },
    {
      title: "Inventario",
      url: "/inventory",
      icon: <PackageIcon />,
    },
    {
      title: "Reportes",
      url: "/reports",
      icon: <ChartBarIcon />,
    },
    {
      title: "Food cost",
      url: "/reports/food-cost",
      icon: <PercentIcon />,
    },
    {
      title: "Fuga interna",
      url: "/reports/leakage",
      icon: <ShieldAlertIcon />,
    },
    {
      title: "Asistencia",
      url: "/attendance",
      icon: <ClockIcon />,
    },
    {
      title: "Merma",
      url: "/waste",
      icon: <Trash2Icon />,
    },
    {
      title: "Benchmark",
      url: "/reports/benchmark",
      icon: <BarChart3Icon />,
    },
  ],
  navSecondary: [
    {
      title: "Configuración",
      url: "/settings",
      icon: <Settings2Icon />,
    },
  ],
  navPlatform: [
    {
      title: "Resumen",
      url: "/platform",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Planes",
      url: "/plans",
      icon: <BadgeDollarSignIcon />,
    },
    {
      title: "Suscripciones",
      url: "/subscriptions",
      icon: <StoreIcon />,
    },
    {
      title: "Usuarios",
      url: "/users",
      icon: <UsersIcon />,
    },
  ],
}

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
      ...data.navSecondary,
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
              render={<Link href={isPlatformAdmin ? "/platform" : "/dashboard"} />}
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
          <NavMain items={data.navPlatform} label="Plataforma" />
        ) : (
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
            <NavMain items={data.navService} label="Servicio" />
            <SidebarSeparator />
            <NavMain items={data.navApplication} label="Aplicación" />
            <NavSecondary items={navSecondary} className="mt-auto" />
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
