import { redirect } from "next/navigation"

import { NotificationList } from "@/components/intel/notification-list"
import { apiFetch } from "@/lib/api"
import type { IntelNotification } from "@/lib/intel"
import { requireUser } from "@/lib/session"

export default async function IntelNotificationsPage() {
  const user = await requireUser()
  const allowed =
    user.roles.includes("ADMIN") || user.roles.includes("INVENTORY_MANAGER")

  if (!allowed) {
    redirect("/dashboard")
  }

  const response = await apiFetch("/intel/notifications?limit=50")
  const notifications: IntelNotification[] = response.ok
    ? ((await response.json()) as IntelNotification[])
    : []

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Bandeja de Intel</h1>
        <p className="text-sm text-muted-foreground">
          Digest diario, alertas y resultados que el copiloto dejó para ti.
        </p>
      </div>

      <NotificationList notifications={notifications} />
    </div>
  )
}
