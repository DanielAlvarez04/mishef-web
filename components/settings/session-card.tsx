"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon, MonitorSmartphoneIcon } from "lucide-react"
import { toast } from "sonner"

import { revokeSession } from "@/app/(app)/settings/security-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export interface AuthSessionInfo {
  id: string
  userAgent: string | null
  ip: string | null
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string
  current: boolean
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function SessionCard({ sessions }: { sessions: AuthSessionInfo[] }) {
  const router = useRouter()
  const [pendingId, setPendingId] = React.useState<string | null>(null)

  function handleRevoke(session: AuthSessionInfo) {
    setPendingId(session.id)

    void (async () => {
      const result = await revokeSession(session.id)

      if (!result.ok) {
        toast.error(result.message ?? "No pudimos cerrar la sesión")
        setPendingId(null)
        return
      }

      if (session.current) {
        router.replace("/login")
        router.refresh()
        return
      }

      toast.success("Sesión cerrada")
      setPendingId(null)
      router.refresh()
    })()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MonitorSmartphoneIcon className="size-4" />
          Sesiones activas
        </CardTitle>
        <CardDescription>
          Dispositivos donde tu cuenta tiene una sesión abierta.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-3">
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay otras sesiones activas.
          </p>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/60 p-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {session.current ? "Esta sesión" : "Sesión"}
                  </span>
                  {session.current ? (
                    <Badge variant="secondary">Actual</Badge>
                  ) : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {session.userAgent ?? "Dispositivo desconocido"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session.ip ?? "IP desconocida"} · Inició{" "}
                  {formatDate(session.createdAt)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleRevoke(session)}
                disabled={pendingId === session.id}
              >
                {pendingId === session.id ? (
                  <Loader2Icon className="animate-spin" />
                ) : null}
                Cerrar sesión
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
