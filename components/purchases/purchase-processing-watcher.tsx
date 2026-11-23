"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon } from "lucide-react"

const REFRESH_INTERVAL = 2500
const MAX_REFRESHES = 40

/**
 * Refresca la página mientras el worker de pg-boss lee el ticket.
 *
 * La extracción ya no bloquea la subida: el ticket se crea y se encola. Este
 * componente hace que la revisión aparezca sola cuando el worker termina, sin
 * que la persona tenga que recargar.
 */
export function PurchaseProcessingWatcher({ status }: { status: string }) {
  const router = useRouter()
  const refreshes = useRef(0)

  useEffect(() => {
    if (status !== "PROCESSING") return

    refreshes.current = 0

    const timer = window.setInterval(() => {
      refreshes.current += 1

      if (refreshes.current > MAX_REFRESHES) {
        window.clearInterval(timer)
        return
      }

      router.refresh()
    }, REFRESH_INTERVAL)

    return () => window.clearInterval(timer)
  }, [status, router])

  if (status !== "PROCESSING") return null

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed bg-muted/30 px-4 py-3 text-sm">
      <Loader2Icon className="size-4 animate-spin" />
      <span>La IA está leyendo el ticket en segundo plano…</span>
      <span className="text-xs text-muted-foreground">
        La página se actualiza sola.
      </span>
    </div>
  )
}
