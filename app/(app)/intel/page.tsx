import { redirect } from "next/navigation"

import { IntelChatPanel } from "@/components/intel/chat-panel"
import { apiFetch } from "@/lib/api"
import type { IntelConfig } from "@/lib/intel"
import { requireUser } from "@/lib/session"

export default async function IntelPage() {
  const user = await requireUser()
  const allowed =
    user.roles.includes("ADMIN") ||
    user.roles.includes("SUPERVISOR") ||
    user.roles.includes("INVENTORY_MANAGER")

  if (!allowed) {
    redirect("/dashboard")
  }

  const response = await apiFetch("/intel/config")
  const config: IntelConfig | null = response.ok
    ? ((await response.json()) as IntelConfig)
    : null

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Intel</h1>
        <p className="text-sm text-muted-foreground">
          El copiloto de tu negocio: preguntas con datos reales y respuestas
          explicables.
        </p>
      </div>

      <IntelChatPanel
        configured={config?.configured ?? false}
        enabled={config?.enabled ?? false}
        models={config?.models ?? []}
      />
    </div>
  )
}
